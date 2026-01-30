<div align="center">
  
![header](https://capsule-render.vercel.app/api?type=waving&color=ffb3dc&height=180&section=header&text=Bootcamp%20AI%20RAG%20Tutor&fontSize=48&fontColor=ffffff&animation=fadeIn&fontAlignY=35&desc=PyMate%20by%20SH%20LAB&descSize=18&descAlignY=60)

<p align="center">
  <img src="images/pymate_logo.png" alt="pymate" width="350"/>
</p>

</div>


<br><br>

## 팀원 및 담당 업무
### SKN21_3rd_3Team
| 이름 | 담당 분야 | 상세 역할 |
|------|-----------|-----------|
| **김가람** <br> [![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github)](https://github.com/gr-kim-94)| **AI Core** | RAG 파이프라인 구축(`src/`), 데이터 전처리, 벡터 DB(Qdrant) 연동, 프롬프트 엔지니어링|
| **최자슈아주원** <br> [![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github)](https://github.com/reasonableplan)| **Backend Lead** | Django 프로젝트 아키텍처 설계, Chat API(SSE 스트리밍) 구현, 메인 UI 템플릿 통합 |
| **신지용** <br> [![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github)](https://github.com/sjy361872)| **DevOps & Infra** | AWS EC2 서버 구축, Docker 컨테이너화, Nginx 리버스 프록시 설정, CI/CD 파이프라인 |
| **윤경은** <br> [![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github)](https://github.com/ykgstar37-lab)  | **Backend & Frontend** | Quiz API 구현, 에러 핸들링 미들웨어, 프론트엔드 스타일링(CSS) 및 로직(JS) 최적화 |
| **안혜빈** <br> [![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github)](https://github.com/hyebinhy)| **AI Core** | RAG 파이프라인 구축(`src/`), 데이터 전처리, 벡터 DB(Qdrant) 연동, 프롬프트 엔지니어링 |
| **정세연** <br> [![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github)](https://github.com/wjdtpdus25)|  |  |


<br><br><br>


## 프로젝트 개요

이 프로젝트는 **RAG(Retrieval-Augmented Generation)** 기술을 활용한 지능형 챗봇과 학습 이해도를 높이기 위한 퀴즈 시스템
을 Django 기반 웹 서비스로 제공합니다

<br>

### 주제 
> **개념·코드·실습 질문에 답변하는 RAG 기반 학습 지원 챗봇**

<br>

본 프로젝트는 **학습 자료 데이터(ipynb)** 와 **Python 공식 문서(Python 3 Documentation)** 를 핵심 지식으로 활용하여 <br>
개념, 코드, 실습 질문에 답변할 수 있는 
RAG(Retrieval-Augmented Generation) 기반 학습 도우미 챗봇을 개발하는 것을 목표로 한다.

특히 강의 자료(ipynb)에 담긴 실습 코드와 설명을 중심으로 <br>
부족할 수 있는 개념적·언어적 설명은 Python 공식 문서를 통해 보완함으로써, <br>
학습자가 **“왜 이 코드가 필요한지”, “이 개념이 어떤 의미를 가지는지”** 를 <br>
자연스럽게 이해할 수 있는 학습 환경을 제공한다.

이를 통해 단순한 정답 제공을 넘어, <br>
**개념 이해 → 코드 해석 → 실습 적용 → 복습 및 점검**으로 이어지는 <br>
일관된 학습 흐름을 지원하는 AI 학습 파트너를 구현하고자 한다.

<br>

### 주요 기능
> **‘질문 → 이해 → 정리 → 점검’ 학습 흐름을 RAG 기반 대화형 AI로 지원하는 학습 서비스**

<br>

1️⃣ **대화형 학습 챗봇 (Chat Mode)** <br>
> **부트캠프 학습 자료와 Python 공식 문서를 기반으로 질문에 답변하는 대화형 AI 학습 튜터를 제공**
- 자연어 질문을 입력하면 실시간으로 답변 생성
- 단순 Q&A가 아닌 학습 맥락을 고려한 설명 제공
- 이전 질문 흐름을 반영한 연속 대화 지원

**예시 질문**:
- “RAG가 뭐야?”
- “Retriever의 역할이 뭐야?”
- “결정트리랑 랜덤포레스트 차이 설명해줘”

<br>

2️⃣ **학습 맥락 중심 응답 생성 (RAG 기반)** <br>
> **Retrieval-Augmented Generation(RAG) 구조를 활용하여 “검색 → 생성” 흐름의 학습 응답을 제공한다.**
- Retriever를 통해 관련 문서 검색
- 검색된 문서를 근거로 LLM이 답변 생성
- 추측이나 일반 지식이 아닌 학습 자료 기반 응답

“왜 이런 답이 나왔는지” 학습 흐름을 유지

<br>

3️⃣ **`퀴즈풀래용`** <br>
> **학습한 내용을 기반으로 AI가 생성한 퀴즈를 직접 풀어볼 수 있는 기능**
- 학습 자료를 기반으로 문제 생성
- OX 퀴즈 제공
- 사용자의 선택에 따라 즉각적인 정답 피드백 제공
- 정답 여부뿐 아니라 개념 보충 설명까지 함께 제공
- **북마크** 기능으로 마이페이지에서 사용자가 챗/퀴즈 북마크 확인 가능

“배웠는지 확인하는 단계”를 자연스럽게 학습 흐름에 포함

<br>

4️⃣ **`코드풀래용`** <br>
> **AI 코드 리뷰 & 오류 분석 기능**

**사용자가 직접 작성한 코드를 입력하면, <br>
AI 선생님이 코드 오류를 분석하고 원인과 해결 방법을 단계적으로 설명**
- 문법 오류 및 실행 오류 자동 분석
- 오류 발생 원인에 대한 자연어 설명
- 수정된 코드 예시 제공
- 실행 결과 예측 및 출력 예시 제공

학습자를 고려한 친절한 튜터형 피드백

<br>

5️⃣ **학습 보조 기능 (스튜디오 기능)** <br>
> **우측 스튜디오 영역을 통해 학습을 돕는 보조 기능을 제공**

- **`개념 요약`** : 현재 질문 주제 핵심 요약 
- **`단계별 설명`** : 개념을 단계적으로 분해하여 설명 
- **`플래시카드`** : 핵심 개념 암기용 카드 제공
- **`퀴즈`** : 학습 내용을 기반으로 한 퀴즈 생성
- **`표로 정리`** : 개념 비교 및 구조화
- **`다른 예시`** : 동일 개념의 추가 예제 제공
- **메모장** : writing 기능

<br>

6️⃣ **학습 기록 관리 (Bookmark & History)** <br>
> **학습 과정에서 나온 질문과 결과를 자동으로 기록 및 관리**
- 북마크를 통한 중요 질문 저장
- 이전 질문 히스토리 확인

<br>

7️⃣ **학습 흐름을 고려한 UI/UX**  <br>
> **PC·모바일 환경 모두에서 동일한 학습 흐름을 유지하는 UI 제공**
- 별도 앱 설치 없이 **웹 브라우저만으로 어디서든 접속 가능**
- 화면 크기에 따라 레이아웃이 자동 조정되어 **가독성과 사용성을 유지**
- 모바일 환경에서도 **채팅 입력, 퀴즈 풀이, 코드 확인/복사**가 불편하지 않도록 UI 최적화

**“질문 → 이해 → 정리 → 점검”** 흐름을 UI로 자연스럽게 유도


<br><br>


## Application의 주요 기능

<br><br>

## RAG 고도화

### 1. 이전 대화 내용 기억하는 Memory Retriever 구현
 
 <p align="center">
        <img src="images/이전답변기억.gif" alt="feature_importance" width="700">
      </p>

<br>

### 2. 답변에 강의 코드 추가

<div align="center">
  <img src="images/코드답변예시.png" alt="코드답변예시" width="700"/>
</div>

<br>

### 3. Retrieval : Reranker 모델 도입

**Reranker 모델** : cross-encoder/ms-marco-MiniLM-L6-v2

BAAI/bge-reranker-v2-m3 모델 사용시 속도 저하로 인해 경량화 모델로 변경해서 (-1s) 최종 결정.

> **Context Precision(문맥 정밀도)**

검색된 문서(context)들 중 질문과 관련 있는 것들이 **얼마나 상위 순위에 위치하는지** 평가하는 지표.
-  **<span style="color:red">0.8333 ➡️ 0.9758 (↑14.4%)</span>**

> **Context Recall(문맥 재현률)**

검색된 문서(context)가 정답(ground-truth)의 정보를 얼마나 포함하고 있는지 평가하는 지표.
-  **<span style="color:red">0.7044 ➡️ 0.7944 (↑12.7%)</span>**

> **LLM 추출 질문에대한 답변 정확도**

답변 못하던 질문들에대해 정성평가에서 뛰어난 답변률을 보여줌

<br><br>

## 시스템 아키텍처

<br>

<p align="center">
  <img src="images/4th_아키텍처.png" alt="pymate" width="800"/>
</p>

<br>


<br><br>

## 프로젝트 구조

```
SKN21-4th-4Team/
│
├─ app.py                      # Flask 애플리케이션(레거시)
├─ main.py                     # RAG 워크플로우 메인 진입점
├─ init_setting.py             # Qdrant 벡터 DB 초기화
├─ utils.py                    # 공용 유틸 함수
├─ update_notebook.py          # 노트북 업데이트 스크립트
├─ requirements.txt            # Python 의존성
├─ pyproject.toml              # 프로젝트 메타데이터
├─ README.md                   # 프로젝트 안내
├─ intro.md                    # 개발환경/소개 문서
├─ evaluation.ipynb            # 평가 노트북
├─ evaluation_advanced.ipynb   # 고급 평가 노트북
│
├─ deploy/                     # 배포 관련 파일
│  ├─ Dockerfile
│  ├─ docker-compose.yml
│  ├─ nginx.conf
│  ├─ deploy.sh
│  └─ ...
│
├─ django_app/                 # Django 프로젝트
│  ├─ manage.py                # Django 관리 스크립트
│  ├─ config/                  # 설정 모듈
│  │  ├─ settings.py
│  │  ├─ urls.py
│  │  ├─ wsgi.py
│  │  └─ asgi.py
│  ├─ backend/                 # API 앱 모음
│  │  ├─ accounts/             # 사용자/인증
│  │  ├─ chat/                 # 대화 API
│  │  ├─ code/                 # 코드 관련 API
│  │  └─ quiz/                 # 퀴즈 API
│  ├─ frontend/                # 정적/템플릿
│  │  ├─ static/               # css/js/images
│  │  └─ templates/            # HTML 템플릿
│  └─ templates/               # 공용 템플릿
├─ src/                        # 핵심 로직 모듈
│  ├─ agent/                   # 에이전트 워크플로우/노드/툴
│  ├─ ingestion/               # 문서 수집/전처리
│  ├─ retrievals/              # 검색/리랭킹
│  ├─ schema/                  # 상태/스키마
│  ├─ utils/                   # 유틸 모음
│  ├─ prompts.py               # 프롬프트
│  └─ quiz_service.py          # 퀴즈 서비스 로직
├─ scripts/                    # 실행 스크립트
│  ├─ build_vector_db.py
│  ├─ evaluate_chunking.py
│  └─ ...
├─ notebooks/                  # 전처리 노트북
├─ docs/                       # 문서/설계 자료
├─ images/                     # 이미지 리소스
└─ templates/                  # 공용 템플릿     
```

원본 데이터(`/data/raw/`)의 경우, 최종 git에서 제거
<br>
<div> 

<br>


## Tech Stack

### Core Utilities & Environment
![ipykernel](https://img.shields.io/badge/ipykernel-CDB4DB?style=for-the-badge&logo=jupyter&logoColor=white)
![python-dotenv](https://img.shields.io/badge/python--dotenv-A8E6CF?style=for-the-badge&logo=dotenv&logoColor=black)
![pydantic](https://img.shields.io/badge/Pydantic-E92063?style=for-the-badge&logo=pydantic&logoColor=white)
![huggingface_hub](https://img.shields.io/badge/huggingface_hub-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black)
![nbformat](https://img.shields.io/badge/nbformat-4B8BBE?style=for-the-badge&logo=python&logoColor=white)

### LLM & RAG Framework
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-EEDFCC?style=for-the-badge&logo=chainlink&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-005571?style=for-the-badge&logo=graphql&logoColor=white)
![langchain_openai](https://img.shields.io/badge/langchain__openai-412991?style=for-the-badge&logo=openai&logoColor=white)
![langchain_community](https://img.shields.io/badge/langchain__community-2F4F4F?style=for-the-badge&logo=chainlink&logoColor=white)
![langchain_tavily](https://img.shields.io/badge/langchain--tavily-DADADA?style=for-the-badge&logo=internetexplorer&logoColor=black)
![langchain_qdrant](https://img.shields.io/badge/langchain__qdrant-FF6F00?style=for-the-badge&logo=qdrant&logoColor=white)


### RAG Evaluation & Similarity
![RAGAS](https://img.shields.io/badge/RAGAS-6A5ACD?style=for-the-badge&logo=databricks&logoColor=white)
![RapidFuzz](https://img.shields.io/badge/RapidFuzz-FF8C00?style=for-the-badge&logo=python&logoColor=white)


### Embedding & Vector Database
![FastEmbed](https://img.shields.io/badge/FastEmbed-2E8B57?style=for-the-badge&logo=lightning&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-FF69B4?style=for-the-badge&logo=qdrant&logoColor=white)
![qdrant-client](https://img.shields.io/badge/qdrant--client-4C72B0?style=for-the-badge&logo=qdrant&logoColor=white)


### Backend & API
![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)
![Django REST Framework](https://img.shields.io/badge/Django_REST_Framework-FF1709?style=for-the-badge&logo=django&logoColor=white)


### Database
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![psycopg2](https://img.shields.io/badge/psycopg2--binary-4B8BBE?style=for-the-badge&logo=postgresql&logoColor=white)


### Legacy / Reference
![Flask](https://img.shields.io/badge/Flask_(Legacy)-000000?style=for-the-badge&logo=flask&logoColor=white)


## 회고

| 이름 | 소감 |
|------|------|
|**김가람**|      |
|**신지용**|      |
|**최자슈아주원**|      |
|**윤경은**|      |
|**안혜빈**|      |
|**정세연** |      |

