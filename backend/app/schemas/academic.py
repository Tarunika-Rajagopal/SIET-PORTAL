from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class AcademicWeekResponse(BaseModel):
    id: UUID
    week_number: int = Field(..., serialization_alias="weekNumber")
    start_date: Optional[datetime] = Field(None, serialization_alias="startDate")
    end_date: Optional[datetime] = Field(None, serialization_alias="endDate")
    is_current: bool = Field(..., serialization_alias="isCurrent")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class DepartmentResponse(BaseModel):
    id: UUID
    name: str
    code: str
    is_active: bool = Field(..., serialization_alias="isActive")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class BatchResponse(BaseModel):
    id: UUID
    department_id: UUID = Field(..., serialization_alias="departmentId")
    name: str
    start_year: Optional[int] = Field(None, serialization_alias="startYear")
    end_year: Optional[int] = Field(None, serialization_alias="endYear")
    is_active: bool = Field(..., serialization_alias="isActive")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class SectionResponse(BaseModel):
    id: UUID
    batch_id: UUID = Field(..., serialization_alias="batchId")
    name: str
    is_active: bool = Field(..., serialization_alias="isActive")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
