from pathlib import Path

from rag.src.utils.config import ConfigDB
from rag.src.ingestion.ingestion_lectures import Ingestor
from rag.src.ingestion.ingestion_rst import RSTIngestor

def init_lectures():
    # 프로젝트 루트 기준: data/raw/lectures
    script_dir = Path(__file__).parent      # ./
    project_root = script_dir.parent        # 프로젝트 루트
    lectures_path = project_root / "data" / "raw" / "lectures"
    print("lectures path : ", lectures_path)
    
    ingestor = Ingestor(
        docs_root=str(lectures_path),
        qdrant_host=ConfigDB.HOST,
        qdrant_port=int(ConfigDB.PORT),
        collection_name=ConfigDB.COLLECTION_NAME,
        # embedding_model_name은 ConfigDB.EMBEDDING_MODEL 기본값 사용
        batch_size=64,
    )
    stats = ingestor.run()
    print(stats)


def init_rst():
    project_root = Path(__file__).parent
    rst_dir = project_root.parent / "data" / "raw" / "python_rst"
    print("Init RST... ", rst_dir)
    
    ingestor = RSTIngestor(
        chunk_size=900,
        chunk_overlap=200,
        qdrant_host=ConfigDB.HOST,
        qdrant_port=int(ConfigDB.PORT),
        collection_name=ConfigDB.COLLECTION_NAME,
        recreate_collection=False,
        embedding_model_name=ConfigDB.EMBEDDING_MODEL,
        batch_size=64,
    )

    if rst_dir.exists():
        print("Start RST...")

        stats = ingestor.run_all(
            str(rst_dir),
            sample_only=False, # sample_only: True면 tutorial/reference/howto만 (빠른 테스트용)
            subdirs=None, # subdirs: 특정 하위 디렉토리만 처리 (예: ['tutorial'])
            test_files=None # test_files: 특정 파일만 처리 (예: ['tutorial/introduction.rst', 'tutorial/controlflow.rst'])
        )


if __name__ == '__main__':
    init_lectures()
    init_rst()