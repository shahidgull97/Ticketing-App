"""Consistent error envelope:

    {"error": {"code": "<machine_code>", "message": "<human text>", "details": {<field>: [msgs]}}}
"""
import logging

from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.views import exception_handler

logger = logging.getLogger("tickets")


class InvalidTransition(APIException):
    """Raised when the ticket's current state does not allow the requested action."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "This action is not allowed in the ticket's current state."
    default_code = "invalid_transition"


def _flatten(detail):
    if isinstance(detail, dict):
        return {k: _flatten(v) for k, v in detail.items()}
    if isinstance(detail, (list, tuple)):
        return [_flatten(v) if isinstance(v, (dict, list)) else str(v) for v in detail]
    return str(detail)


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API error", extra={"path": getattr(context.get("request"), "path", "")})
        return _build(500, "server_error", "Something went wrong on our side. Please try again.")

    if isinstance(exc, ValidationError):
        details = _flatten(exc.detail)
        if isinstance(details, list):
            details = {"non_field_errors": details}
        return _build(response.status_code, "validation_error", "Please correct the highlighted fields.", details)
    if isinstance(exc, Http404):
        return _build(404, "not_found", "The requested resource was not found.")
    if isinstance(exc, APIException):
        code = exc.get_codes() if isinstance(exc.get_codes(), str) else "error"
        return _build(response.status_code, code, str(exc.detail))
    return response


def _build(http_status, code, message, details=None):
    from rest_framework.response import Response

    body = {"error": {"code": code, "message": message}}
    if details:
        body["error"]["details"] = details
    return Response(body, status=http_status)

