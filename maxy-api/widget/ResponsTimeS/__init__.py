"""Response & Loading Time (S) widget routes."""

from . import loading_routes as _loading_routes  # noqa: F401
from . import routes as _response_routes  # noqa: F401

__all__ = ["_response_routes", "_loading_routes"]
