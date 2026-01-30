from src.schema.state import AgentState
from src.retrievals.search_agent import execute_dual_query_search
from src.retrievals.search_router import build_search_config

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from src.utils.config import ConfigLLM
from src.prompts import CONDENSE_QUESTION_PROMPT
from src.retrievals.reranker import Reranker
from src.utils.search_utils import is_korean, translate_to_english

def rewrite_query(original_query: str, messages: list) -> str:
    """
    대화 기록이 있는 경우, 이전 맥락을 반영하여 질문을 재작성합니다.
    """
    if not messages or len(messages) <= 1:
        return original_query

    # 대화 기록 포맷팅 (최근 3개 턴만 사용하거나 전체 사용)
    # LangGraph의 messages는 (type, content) 튜플 리스트일 수도 있고, BaseMessage 객체 리스트일 수도 있음.
    # 안전하게 처리
    formatted_history = []
    
    # 마지막 메시지는 현재 쿼리이므로 제외하고 이전 기록만 사용
    history_messages = messages[:-1] 
    
    for msg in history_messages[-6:]: # 최근 6개 메시지 (3턴) 참조
        if hasattr(msg, 'content'):
            role = "Human" if msg.type == 'human' else "Assistant"
            formatted_history.append(f"{role}: {msg.content}")
        elif isinstance(msg, tuple):
            role = "Human" if msg[0] == 'human' else "Assistant"
            formatted_history.append(f"{role}: {msg[1]}")
            
    history_str = "\n".join(formatted_history)

    # print("===== START history_str =====", flush=True)
    # print(history_str, flush=True)
    # print("===== END history_str =====", flush=True)

    # LLM 설정
    llm = ChatOpenAI(model=ConfigLLM.OPENAI_MODEL, temperature=0)
    prompt = ChatPromptTemplate.from_template(CONDENSE_QUESTION_PROMPT)
    chain = prompt | llm | StrOutputParser()
    
    try:
        rewritten_query = chain.invoke({
            "chat_history": history_str,
            "question": original_query
        })
        print(f"🔄 [Rewrite Query] Original: '{original_query}' -> Rewritten: '{rewritten_query}'")
        return rewritten_query
    except Exception as e:
        print(f"⚠️ Query Rewrite Failed: {e}")
        return original_query


def search_node(state: AgentState):
    """
    LangGraph 노드용 함수
    state에서 query를 읽고, 검색 결과를 반환
    """
    
    original_query = state['query']
    messages = state.get('messages', [])

    query = rewrite_query(original_query, messages)

    english_query = ""
    if len(query) > 0 and is_korean(query):
        # 2. 번역(영어 키워드) 검색
        english_query = translate_to_english(query)

    # 검색 설정 결정
    config = build_search_config(query)
    
    # 질문 유효성 체크
    if not config.get('is_valid', True):  # 기본값 True (기존 호환성)
        print("⚠️ 질문이 학습 자료와 관련이 없어 검색을 건너뜁니다.")
        return {
            'search_results': []
        }
    
    # 검색 설정 및 실행 (하이브리드 검색 기본 적용)
    results, query_info = execute_dual_query_search(query, english_query)
    
    # 결과 포맷팅
    search_results = [
        {
            "english_query": english_query,
            "content": r['content'],
            "score": round(r['score'], 4),
            "metadata": r['metadata']
        }
        for r in results
    ]
    
    return {
        'search_results': search_results,
        'search_top_k': config.get('top_k', ConfigLLM.TOP_K)
    }
    
    
def rerank_node(state: AgentState):
    """
    search_node에서 1차 선별된 결과(search_results)를 
    Cross-Encoder 모델로 정밀 재정렬(Reranking)합니다.
    """
    query = state['query']
    results = state.get('search_results', [])
    
    # 결과가 없으면 종료
    if not results:
        return {"search_results": []}

    # 관련성 점수 계산 (Inference)
    reranker = Reranker(top_k=state.get('search_top_k', ConfigLLM.TOP_K))
    reranked_results = reranker.invoke(query, results)

    # 결과 포맷팅
    search_results = [
        {
            "content": "=== [내부 자료 (Original)] === \n\n" + r['content'],
            "score": round(r['score'], 4),
            "metadata": r['metadata']
        }
        for r in reranked_results
    ]

    return {
        "search_results": search_results
    }


def build_context(state: AgentState):
    """
    보고서 작성: LLM이 읽기 좋게 문장으로 정리합니다.
    """

    results = state['search_results']
    
    if not results:
        return {"context": "검색된 관련 자료가 없습니다."}
    
    context_parts = []
    
    for i, res in enumerate(results, 1): # 번호는 1번부터
        source = res['metadata'].get('source', 'Unknown')
        code_snippet = res['metadata'].get('code_snippet')

        score = round(res['score'], 2)
        content = res['content'].strip()
        
        part = f"[Original {i}] 출처: {source} (유사도: {score})\n{content}"
        if code_snippet:
            part += f"\n\n코드 예제:\n```python\n{code_snippet}\n```"
            
            print("===== code_snippet =====")
            print(code_snippet)
            print("===== code_snippet =====")

        context_parts.append(part)
        
    context = "\n\n---\n\n".join(context_parts)


    return {"context": context}