from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class LoginRequest(BaseModel):
    emailOrRoll: str = Field(..., description="User email or student roll number")
    password: str = Field(..., description="User password")

class SwitchRoleRequest(BaseModel):
    targetRole: str = Field(..., description="The role to switch to")

class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    roll_no: Optional[str] = Field(None, serialization_alias="rollNo")
    department: str = Field("Computer Science and Engineering")
    role: str
    roles: List[str]
    active_role: str = Field(..., serialization_alias="activeRole")
    designation: Optional[str] = None
    phone: Optional[str] = None
    batch: Optional[str] = None
    section: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class LoginResponse(BaseModel):
    success: bool = True
    token: str
    user: UserResponse

class SwitchRoleResponse(BaseModel):
    success: bool = True
    token: str
    user: UserResponse
