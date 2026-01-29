# ========== 검색 라우터 프롬프트 ==========
SEARCH_ROUTER_PROMPT = """다음 질문을 분석하고, 최적의 검색 설정을 결정해주세요:

## Input
질문: "{query}"

## Output
**0. is_valid (질문의 유효성 여부) - 가장 먼저 판단 (매우 엄격하게!):**
- True: 머신러닝, Python, 데이터 분석 등 학습 자료와 관련된 **명확하고 구체적인 질문**
  * 반드시 질문 형식이거나 학습 목적이 명확해야 함
  * 예: "RAG가 뭐야?", "Python list 사용법", "머신러닝 모델 학습 방법"
  
- False: 다음 경우들 (하나라도 해당되면 False)
  * 의미없는 단어 혼합: "나는 요리가 좋아 파이썬", "냄새 정말많이나 머신러닝 룰루"
  * 의미없는 반복 단어: "응가응가응가응가 파이썬", "머신러닝 띠 띠 띠"
  * 일상 대화/감정 표현: "너무 재미있어", "하고싶다", "좋아", "싫어" 등 감정 표현만 있는 경우
  * 키워드만 나열 (2개 이상): "파이썬 띠 머신러닝"처럼 여러 단어만 나열되고 질문 형식이 아닌 경우
  * 학습과 무관한 주제: 요리, 냄새, 일상 대화 등
  * 학습 자료와 관련 없는 일반 상식 질문
  
**중요**: 
- 키워드("파이썬", "머신러닝")가 있어도, 실제 질문이 아니거나 일상 대화/감정 표현이 주를 이루면 반드시 False!
- **단일 단어 기술 용어는 허용**: "RAGAS", "RAG", "BERT", "GPT" 등 단일 단어라도 머신러닝/Python 관련 기술 용어면 True!

분석 및 결정 기준:

1. **query_type** (질문 유형):
   - concept: "~가 뭐야?", "설명해줘", "차이점은?" 같은 개념 이해 질문
   - code: "코드 작성해줘", "구현 방법", "에러 해결" 같은 코드 관련 질문
   - syntax: "문법", "사용법", "어떻게 써?" 같은 Python 문법 질문

2. **topic_keywords** (주요 키워드):
   - 머신러닝/딥러닝: rag, embedding, vector, 모델, 학습, 분류, 회귀, sklearn, iris, 결정트리 등
   - Python 기초: list, dict, tuple, set, for, while, if, def, class, pandas, numpy 등
   - 실용적인 기술명을 소문자로 추출 (예: "RAG가 뭐야?" → ['rag'])

3. **complexity** (난이도):
   - basic: 기본 개념, 간단한 질문 ("list가 뭐야?", "iris 데이터셋이란?")
   - intermediate: 비교, 구현, 응용 ("RAG 구현 방법", "pandas로 데이터 전처리")
   - advanced: 최적화, 알고리즘, 성능 튜닝 ("모델 최적화", "대규모 데이터 처리")

4. **search_sources** (검색 대상) - 매우 중요!:
   - ['lecture']: ML/딥러닝 관련 질문 (RAG, embedding, 분류, 회귀, 모델, 결정트리, 경사하강법 등)
   - ['python_doc']: Python 문법/개념/라이브러리 질문 (list, dict, for, class, 상속, 예외처리, 모듈 등)
     * Python 기본 개념: class, inheritance(상속), polymorphism, encapsulation 등
     * Python 문법: list, dict, for, while, if, def, try/except 등
     * Python 표준 라이브러리: os, sys, json, datetime 등
   - ['lecture', 'python_doc']: ML + Python 복합 질문 예시:
     * "RAG 구현할 때 Python list comprehension 사용 방법"
     * "pandas로 iris 데이터 전처리하는 방법"
     * "scikit-learn으로 분류 모델 만들 때 dictionary 활용법"
   
    판단 기준:
    - ML/딥러닝 키워드만 있으면 → ['lecture'] (예: RAG, embedding, 분류, 회귀, 결정트리, 경사하강법)
    - Python 문법/개념 키워드만 있으면 → ['python_doc'] (예: class, 상속, list, dict, 예외처리, 모듈)
    - ML + Python 문법 둘 다 있으면 → ['lecture', 'python_doc']

5. **top_k** (검색 개수):
   - basic: 3개 (간단한 질문은 적은 문서로 충분)
   - intermediate: 5개 (중급 질문은 중간 개수)
   - advanced: 7개 (복잡한 질문은 많은 문서 참조)

6. **search_method** (검색 방법):
   - similarity: basic/intermediate 질문 (단순 유사도 검색)
   - mmr: advanced 질문 (Maximum Marginal Relevance - 다양성 고려)

7. **filter** (필터 상세 설정):
   - **filter_chapter**: 질문이 특정 강의 챕터와 관련된 경우 선택. 후보: ['ch1_intro', 'ch2_syntax', 'ch3_class']. 관련 없으면 None.
   - **filter_has_code**: 질문이 코드 예제나 구현을 요구하면 True, 아니면 None.

7. **weights** (검색 가중치 설정) - **합이 1.0 필수**:
   - vector_weight: 개념/의미 파악이 중요할 때 높임 (기본 0.6)
   - keyword_weight: 특정 용어/에러코드 매칭이 중요할 때 높임 (기본 0.2)
   - bm25_weight: 희소한 고유명사 검색 시 높임 (기본 0.2)
   
   [가이드]
   - "개념 설명해줘" → vector=0.8, keyword=0.1, bm25=0.1
   - "AttributeError 해결법" → vector=0.2, keyword=0.4, bm25=0.4 (에러는 키워드 중요)

8. **최적화된 쿼리(optimized_query) 생성 규칙**:
   - 불용어(은,는,이,가 등) 제거
   - 핵심 기술 용어 위주로 재작성
   - 예: "RAG가 뭐니?" -> "RAG 개념 정의"
   - "영어 기술 용어는 한글과 병기하라 (예: '임베딩' -> 'embedding 임베딩')."

## 예시:
- "RAG가 뭐야?"
  → is_valid=True
  → optimized_query="RAG 개념"
  → weights={vector:0.8, keyword:0.1, bm25:0.1}
  → top_k=3, similarity, sources=['lecture']
  
- "ch2 챕터의 리스트 문법 코드 예제 보여줘"
  → is_valid=True
  → optimized_query="list syntax example"
  → weights={vector:0.3, keyword:0.5, bm25:0.2}
  → top_k=5, sources=['lecture', 'python_doc']

- "상속이란 무엇인가"
  → is_valid: True
  → query_type: concept, complexity: basic
  → optimized_query: "Python inheritance OOP"
  → sources: ['python_doc']
  → weights: {vector: 0.8, keyword: 0.1, bm25: 0.1}, top_k: 3, method: similarity

- "클래스 정의하는 방법"
  → is_valid: True
  → query_type: syntax, complexity: basic
  → optimized_query: "how to define python class"
  → sources: ['python_doc']
  → weights: {vector: 0.4, keyword: 0.4, bm25: 0.2}, top_k: 3, method: similarity

- "나는 요리가 좋아 파이썬"
  → is_valid=False (의미없는 단어 혼합, 학습과 무관)
  
- "냄새 정말많이나 머신러닝 룰루"
  → is_valid=False (의미없는 단어 혼합)
  
- "응가응가응가응가 파이썬 띠 머신러닝 너무 재미있어롤하고싶다"
  → is_valid=False (의미없는 반복 단어 + 일상 대화/감정 표현, 실제 질문 아님)
  
- "파이썬 띠 머신러닝"
  → is_valid=False (키워드만 나열, 질문 형식 아님)
"""
