import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

from pinecone import Pinecone

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(host=os.getenv("PINECONE_HOST"))
stats = index.describe_index_stats()
print(stats)
print(f"\ntotal_vector_count: {stats.total_vector_count}")
