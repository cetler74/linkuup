"""
Employee Time-off schemas for API requests and responses
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import date, datetime
from enum import Enum

class TimeOffType(str, Enum):
    HOLIDAY = "holiday"
    SICK_LEAVE = "sick_leave"
    PERSONAL_DAY = "personal_day"
    VACATION = "vacation"

class HalfDayPeriod(str, Enum):
    AM = "AM"
    PM = "PM"

class TimeOffStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class EmployeeTimeOffBase(BaseModel):
    """Base schema for employee time-off"""
    time_off_type: TimeOffType
    start_date: date
    end_date: date
    is_full_day: bool = True
    half_day_period: Optional[HalfDayPeriod] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

    @validator('half_day_period')
    def validate_half_day_period(cls, v, values):
        """Validate half_day_period is set when is_full_day is False"""
        if not values.get('is_full_day', True) and v is None:
            raise ValueError('half_day_period must be specified when is_full_day is False')
        if values.get('is_full_day', True) and v is not None:
            raise ValueError('half_day_period must be None when is_full_day is True')
        return v

    @validator('end_date')
    def validate_end_date(cls, v, values):
        """Validate end_date is not before start_date"""
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('end_date must not be before start_date')
        return v

    @validator('recurrence_pattern')
    def validate_recurrence_pattern(cls, v, values):
        """Validate recurrence pattern when is_recurring is True"""
        if values.get('is_recurring', False) and v is None:
            raise ValueError('recurrence_pattern must be specified when is_recurring is True')
        if v is not None:
            if not isinstance(v, dict):
                raise ValueError('recurrence_pattern must be a dictionary')
            if 'frequency' not in v:
                raise ValueError('recurrence_pattern must include frequency')
            if v.get('frequency') == 'yearly':
                if 'month' not in v or 'day' not in v:
                    raise ValueError('yearly recurrence_pattern must include month and day')
                if not (1 <= v['month'] <= 12):
                    raise ValueError('month must be between 1 and 12')
                if not (1 <= v['day'] <= 31):
                    raise ValueError('day must be between 1 and 31')
        return v

class EmployeeTimeOffCreate(EmployeeTimeOffBase):
    """Schema for creating employee time-off"""
    employee_id: int
    place_id: int

class EmployeeTimeOffUpdate(BaseModel):
    """Schema for updating employee time-off"""
    time_off_type: Optional[TimeOffType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_full_day: Optional[bool] = None
    half_day_period: Optional[HalfDayPeriod] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class TimeOffStatusUpdate(BaseModel):
    """Schema for updating time-off status"""
    status: TimeOffStatus
    notes: Optional[str] = None

class EmployeeTimeOffResponse(EmployeeTimeOffBase):
    """Schema for employee time-off response"""
    id: int
    employee_id: int
    place_id: int
    status: TimeOffStatus
    requested_by: Optional[int] = None
    approved_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    # Employee information
    employee_name: Optional[str] = None
    employee_email: Optional[str] = None
    requester_name: Optional[str] = None
    approver_name: Optional[str] = None

    class Config:
        from_attributes = True

class TimeOffCalendarResponse(BaseModel):
    """Schema for calendar view response"""
    date: date
    time_offs: List[EmployeeTimeOffResponse]

class TimeOffSummaryResponse(BaseModel):
    """Schema for time-off summary statistics"""
    employee_id: int
    employee_name: str
    total_days: int
    by_type: Dict[str, int]
    upcoming_time_off: List[EmployeeTimeOffResponse]

class TimeOffConflictResponse(BaseModel):
    """Schema for time-off conflict detection"""
    has_conflict: bool
    conflicting_time_offs: List[EmployeeTimeOffResponse]
    message: str

class RecurrencePatternCreate(BaseModel):
    """Schema for creating recurrence patterns"""
    frequency: str = Field(..., description="Frequency: 'yearly'")
    month: Optional[int] = Field(None, ge=1, le=12, description="Month (1-12) for yearly recurrence")
    day: Optional[int] = Field(None, ge=1, le=31, description="Day (1-31) for yearly recurrence")

    @validator('month', 'day')
    def validate_recurrence_fields(cls, v, values):
        """Validate recurrence fields are provided for yearly frequency"""
        if values.get('frequency') == 'yearly':
            if v is None:
                raise ValueError(f'{cls.__fields__[cls.__fields__[v].name].name} is required for yearly recurrence')
        return v

class BulkTimeOffCreate(BaseModel):
    """Schema for creating multiple time-off entries at once"""
    employee_ids: List[int]
    time_off_data: EmployeeTimeOffBase
    start_date: date
    end_date: date

class TimeOffFilterParams(BaseModel):
    """Schema for filtering time-off queries"""
    employee_id: Optional[int] = None
    place_id: Optional[int] = None
    time_off_type: Optional[TimeOffType] = None
    status: Optional[TimeOffStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_recurring: Optional[bool] = None
    limit: Optional[int] = Field(100, ge=1, le=1000)
    offset: Optional[int] = Field(0, ge=0)
