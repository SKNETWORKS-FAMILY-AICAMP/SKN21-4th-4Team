class Downloader:
    def __init__(self, docs_root: str):
        self.docs_root = os.path.abspath(docs_root)
        