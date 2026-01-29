"""
Search Router - 검색 전략 결정 모듈

이 모듈의 역할:
- 사용자의 질문을 받아서 분석합니다
- 어디서 검색할지 결정합니다 (lecture DB, python_doc DB, 또는 둘 다)
- 몇 개의 문서를 검색할지 결정합니다
- 어떤 방법으로 검색할지 결정합니다 (similarity, mmr)

핵심 개념: 완전 LLM 기반
- LLM(GPT-4o-mini)이 모든 판단을 수행합니다
- Structured Output으로 안정적인 데이터 반환
- 질문 유효성, 타입, 난이도, 검색 소스를 자동 분석
"""

import os
from dotenv import load_dotenv

# .env 파일에서 환경 변수 로드 (OPENAI_API_KEY 등)
load_dotenv()

from typing import Dict, List, Literal, Optional
from langchain_openai import ChatOpenAI  # OpenAI LLM 인터페이스
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate
from pydantic import BaseModel, Field, validator    # 데이터 검증 및 구조화

from src.agent.prompts import PROMPTS
from src.utils.config import ConfigLLM

class SearchConfig(BaseModel):
    is_valid: bool = Field(description="질문의 유효성 여부")
    query_type: Literal['concept', 'code', 'syntax'] = Field(description="질문 타입: concept(개념 설명), code(코드 작성/디버깅), syntax(문법)")
    topic_keywords: List[str] = Field(description="질문에서 추출된 주요 기술 키워드 (예: rag, python, pandas, iris)")
    complexity: Literal['basic', 'intermediate', 'advanced'] = Field(description="질문의 난이도: basic(기초), intermediate(중급), advanced(고급)")
    search_sources: List[Literal['lecture', 'python_doc']] = Field(description="검색할 데이터 소스 목록. lecture(강의 자료), python_doc(Python 공식 문서)")

    # [Restored] 동적 필터 필드
    filter_chapter: Optional[Literal['ch1_intro', 'ch2_syntax', 'ch3_class']] = Field(
        default=None, 
        description="특정 챕터 필터. 질문이 특정 강의 챕터와 명확히 관련될 때만 선택. 모호하면 None."
    )
    filter_has_code: Optional[bool] = Field(
        default=None, 
        description="True면 코드가 포함된 문서/셀만 검색. 코드 예제를 찾을 때 사용."
    )

    optimized_query: str = Field(description="검색 최적화 쿼리")
    
    # 가중치 설정 (합이 1이 되도록 검증 로직 추가 가능)
    vector_weight: float = Field(0.6, description="Semantic 가중치")
    keyword_weight: float = Field(0.2, description="Lexical 가중치")
    bm25_weight: float = Field(0.2, description="BM25 가중치")

    top_k: int = Field(ge=1, le=10, description="검색할 문서 개수. basic: 3개, intermediate: 5개, advanced: 7개")
    search_method: Literal['similarity', 'mmr'] = Field(description="검색 알고리즘: similarity(유사도), mmr(Most-Mutually-Exclusive)")

    @validator('vector_weight', 'keyword_weight', 'bm25_weight')
    def check_weights(cls, v):
        if not 0 <= v <= 1:
            raise ValueError("가중치는 0과 1 사이여야 합니다.")
        return v

def build_search_config(query: str) -> Dict:
    """
    LLM을 활용하여 질문 분석 및 검색 설정을 한 번에 생성합니다.
    
    Args:
        query: 사용자 질문
        
    Returns:
        {
            'sources': List[str],
            'top_k': int,
            'search_method': str,
            'filters': Dict
        }
    """
    
    prompt = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate.from_template(PROMPTS["SEARCH_ROUTER_PROMPT"])
    ])
    
    llm = ChatOpenAI(
        model=ConfigLLM.OPENAI_MODEL,
        temperature=0
    )
    
    structured_llm = llm.with_structured_output(SearchConfig)
    chain = prompt | structured_llm
    result = chain.invoke({"query": query})

    # 필터 dict 구성 (실제 Qdrant 필터 구조로 변환은 search_agent 등에서 처리 추천)
    # 결과 구성 시 가중치 정규화 (LLM 실수 방지)
    total_w = result.vector_weight + result.keyword_weight + result.bm25_weight
    normalized_weights = {
        'vector': result.vector_weight / total_w,
        'keyword': result.keyword_weight / total_w,
        'bm25': result.bm25_weight / total_w
    }

    # [Fixed] filters 딕셔너리 생성
    filters = {
        'chapter': result.filter_chapter,
        'has_code': result.filter_has_code
    }

    return {
        'config': {
            'top_k': result.top_k,
            'filters': filters,
            'weights': normalized_weights,
            'sources': result.search_sources
        },
        'is_valid': result.is_valid,
        'optimized_query': result.optimized_query,
        # 'weights': normalized_weights, # config 안에 포함시킴
        '_analysis': {
            'query_type': result.query_type,
            'topic_keywords': result.topic_keywords,
            'complexity': result.complexity
        }
    }