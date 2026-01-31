from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, SparseVectorParams 
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import (
    FastEmbedSparse, 
    QdrantVectorStore, 
    RetrievalMode, 
)

from rag.src.utils.config import ConfigDB

class VectorStore:
    def __init__(self):
        self.client = QdrantClient(host=ConfigDB.HOST, port=ConfigDB.PORT)
        self.embedding = OpenAIEmbeddings(model=ConfigDB.EMBEDDING_MODEL)
        self.sparse_embedding = FastEmbedSparse(model_name=ConfigDB.SPARSE_EMBEDDING_MODEL)
        
        self.vector_store = None
        self.collection_name = None


    def collection_exists(self, collection_name: str = ConfigDB.COLLECTION_NAME) -> bool:
        return self.client.collection_exists(collection_name=collection_name)
    

    def delete_collection(self, collection_name: str = ConfigDB.COLLECTION_NAME):
        if self.client.collection_exists(collection_name=collection_name):
            self.client.delete_collection(collection_name=collection_name)
            print(f"컬렉션 '{collection_name}' 삭제 완료!")


    def init_collection(self, collection_name: str = ConfigDB.COLLECTION_NAME):
        if not self.client.collection_exists(collection_name=collection_name):
            vector_size = ConfigDB.VECTOR_SIZE

            self.client.create_collection(
                collection_name=collection_name,
                vectors_config={"dense": VectorParams(size=vector_size, distance=Distance.COSINE)},
                sparse_vectors_config={"sparse": SparseVectorParams()},
            )

            print(f"컬렉션 '{collection_name}' 생성 완료! (vector_size={vector_size})")


    def get_vector_store(self, collection_name: str = ConfigDB.COLLECTION_NAME) -> QdrantVectorStore|None:
        if self.vector_store is None:
            self.collection_name = collection_name
            self.vector_store = QdrantVectorStore(
                client=self.client,
                collection_name=collection_name,
                embedding=self.embedding,
                sparse_embedding=self.sparse_embedding,
                retrieval_mode=RetrievalMode.HYBRID,
                vector_name="dense",
                sparse_vector_name="sparse",
                validate_collection_config=True,
            )

        return self.vector_store

    
