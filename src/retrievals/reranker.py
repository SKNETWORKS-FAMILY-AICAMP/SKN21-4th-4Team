from typing import List, Any
from langchain_core.documents import Document
from langchain_classic.retrievers.document_compressors import CrossEncoderReranker
from langchain_community.cross_encoders import HuggingFaceCrossEncoder 
from src.utils.config import ConfigLLM

_reranker = HuggingFaceCrossEncoder(model_name=ConfigLLM.RERANKER_MODEL)

class Reranker:
    def __init__(self, top_k: int = 5):
        # 모델 초기화
        self.top_k = top_k
        self.reranker = _reranker
        self.compressor = CrossEncoderReranker(model=self.reranker, top_n=top_k)


    def invoke(self, query: str, results: List) -> List[float]:
        """
        이미 검색된 결과(List[Dict])를 받아서 재정렬 점수를 반환합니다.
        """
        print(f"🔄 Reranking 진행 (후보 {len(results)}개)...")
        
        # 1. Dict -> Document 변환
        documents = []
        for doc in results:
            metadata = doc.get('metadata', {})
            metadata['original_score'] = doc.get('score', 0)
            metadata['source'] = doc.get('source', '')
            documents.append(Document(
                page_content=doc['content'],
                metadata=metadata,
            ))
            
        # 2. Compressor로 재정렬 수행
        compressed_docs = self.compressor.compress_documents(documents, query)
        
        # 2.1. Compressor 결과 확인
        print("Compressor 결과:")
        for i, doc in enumerate(compressed_docs):
            print(f"{i+1}. {doc}")
            print(f"   점수: {doc.metadata.get('relevance_score', 0.0)}")
            print(f"   원본 점수: {doc.metadata.get('original_score', 0.0)}")
            print("-" * 50)
        
        result_docs = []
        # 3. 점수 업데이트 (기존 하이브리드 점수는 보존하고 rerank_score 추가)
        for i, doc in enumerate(compressed_docs):
            result_docs.append({
                'content': doc.page_content,
                'score': doc.metadata.get('original_score', 0.0),
                'source': doc.metadata.get('source', ''),
                'metadata': doc.metadata,
            })
        
        # 4. 정렬 및 필터링
        reranked_results = sorted(result_docs, key=lambda x: x['score'], reverse=True)
        
        print(f"✅ Reranking 완료: 상위 {len(reranked_results)}개 선택됨")

        return reranked_results[:self.top_k]