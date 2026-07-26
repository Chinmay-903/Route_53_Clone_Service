"""Write the application's OpenAPI schema to a file.

CI runs this and regenerates the frontend client from the result, so a breaking
API change becomes a frontend typecheck failure rather than a runtime surprise.
Generating from the app object avoids having to boot a server first.
"""

import json
import sys
from pathlib import Path

from app.main import create_app


def main() -> None:
    """Write openapi.json to the path given as the first argument."""
    destination = Path(sys.argv[1] if len(sys.argv) > 1 else "openapi.json")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(create_app().openapi(), indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {destination}")


if __name__ == "__main__":
    main()
