import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    bifrost_api_key: str
    llm_api_base: str
    model_name: str
    model_effort: str
    node_api_base: str


def get_settings() -> Settings:
    return Settings(
        bifrost_api_key=os.environ["BIFROST_API_KEY"],
        llm_api_base=os.environ["BIFROST_BASE_URL"],
        model_name=os.environ.get("BIFROST_MODEL", "anthropic/claude-opus-5"),
        model_effort=os.environ.get("BIFROST_MODEL_EFFORT", "high"),
        node_api_base=os.environ.get("NODE_API_BASE", "http://localhost:4000"),
    )
