from typing import Any, Dict, Optional

class APIException(Exception):
    def __init__(
        self,
        status_code: int,
        message: str,
        details: Optional[Any] = None
    ):
        self.status_code = status_code
        self.message = message
        self.details = details
        super().__init__(message)

class BadRequestException(APIException):
    def __init__(self, message: str = "Bad Request", details: Optional[Any] = None):
        super().__init__(status_code=400, message=message, details=details)

class UnauthorizedException(APIException):
    def __init__(self, message: str = "Unauthorized", details: Optional[Any] = None):
        super().__init__(status_code=401, message=message, details=details)

class ForbiddenException(APIException):
    def __init__(self, message: str = "Forbidden", details: Optional[Any] = None):
        super().__init__(status_code=403, message=message, details=details)

class NotFoundException(APIException):
    def __init__(self, message: str = "Resource Not Found", details: Optional[Any] = None):
        super().__init__(status_code=404, message=message, details=details)

class ConflictException(APIException):
    def __init__(self, message: str = "Resource Conflict", details: Optional[Any] = None):
        super().__init__(status_code=409, message=message, details=details)
