"""
Helper functions for employee time-off management
"""
from datetime import date, datetime, time
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, select
# from models.business import EmployeeTimeOff, BusinessEmployee  # Temporarily disabled due to relationship issues
from models.place_existing import PlaceEmployee
from schemas.employee_time_off import TimeOffStatus

def check_employee_availability(
    employee_id: int, 
    check_date: date, 
    time_range: Optional[Tuple[time, time]] = None,
    db: Session = None
) -> bool:
    """
    Check if an employee is available on a specific date and time range.
    
    Args:
        employee_id: ID of the employee to check
        check_date: Date to check availability
        time_range: Optional tuple of (start_time, end_time) for partial day checks
        db: Database session
    
    Returns:
        True if employee is available, False if on time-off
    """
    if not db:
        return True
    
    # Query for approved time-off on the specific date
    query = select(EmployeeTimeOff).where(
        and_(
            EmployeeTimeOff.employee_id == employee_id,
            EmployeeTimeOff.status == TimeOffStatus.APPROVED,
            EmployeeTimeOff.start_date <= check_date,
            EmployeeTimeOff.end_date >= check_date
        )
    )
    
    time_offs = db.execute(query).scalars().all()
    
    # Check if any time-off covers the requested time
    for time_off in time_offs:
        if time_off.is_full_day:
            return False  # Full day off
        
        # For half-day time-off, check if time range conflicts
        if time_range and not time_off.is_full_day:
            start_time, end_time = time_range
            if time_off.half_day_period == 'AM' and start_time < time(12, 0):
                return False  # Morning time-off conflicts
            elif time_off.half_day_period == 'PM' and end_time > time(12, 0):
                return False  # Afternoon time-off conflicts
    
    # Check recurring time-off
    recurring_query = select(EmployeeTimeOff).where(
        and_(
            EmployeeTimeOff.employee_id == employee_id,
            EmployeeTimeOff.status == TimeOffStatus.APPROVED,
            EmployeeTimeOff.is_recurring == True
        )
    )
    
    recurring_time_offs = db.execute(recurring_query).scalars().all()
    
    for time_off in recurring_time_offs:
        if time_off.is_active_on_date(check_date):
            if time_off.is_full_day:
                return False
            # Check half-day recurring conflicts
            if time_range and not time_off.is_full_day:
                start_time, end_time = time_range
                if time_off.half_day_period == 'AM' and start_time < time(12, 0):
                    return False
                elif time_off.half_day_period == 'PM' and end_time > time(12, 0):
                    return False
    
    return True

def get_conflicting_time_offs(
    employee_id: int,
    start_date: date,
    end_date: date,
    exclude_id: Optional[int] = None,
    db: Session = None
) -> List[EmployeeTimeOff]:
    """
    Get all time-off entries that conflict with the given date range.
    
    Args:
        employee_id: ID of the employee
        start_date: Start date of the proposed time-off
        end_date: End date of the proposed time-off
        exclude_id: Optional ID to exclude from conflict check (for updates)
        db: Database session
    
    Returns:
        List of conflicting time-off entries
    """
    if not db:
        return []
    
    query = select(EmployeeTimeOff).where(
        and_(
            EmployeeTimeOff.employee_id == employee_id,
            EmployeeTimeOff.status.in_([TimeOffStatus.APPROVED, TimeOffStatus.PENDING]),
            or_(
                # Overlapping date ranges
                and_(
                    EmployeeTimeOff.start_date <= end_date,
                    EmployeeTimeOff.end_date >= start_date
                )
            )
        )
    )
    
    if exclude_id:
        query = query.where(EmployeeTimeOff.id != exclude_id)
    
    return db.execute(query).scalars().all()

def expand_recurring_time_off(time_off: EmployeeTimeOff, year: int) -> List[date]:
    """
    Generate actual dates for a specific year from a recurring time-off pattern.
    
    Args:
        time_off: The recurring time-off entry
        year: Year to generate dates for
    
    Returns:
        List of dates when the time-off occurs in the given year
    """
    if not time_off.is_recurring or not time_off.recurrence_pattern:
        return []
    
    pattern = time_off.get_recurrence_pattern()
    if pattern.get('frequency') == 'yearly':
        month = pattern.get('month')
        day = pattern.get('day')
        if month and day:
            try:
                return [date(year, month, day)]
            except ValueError:
                # Invalid date (e.g., Feb 30)
                return []
    
    return []

def get_time_off_for_date_range(
    employee_ids: List[int],
    start_date: date,
    end_date: date,
    db: Session = None
) -> Dict[int, List[EmployeeTimeOff]]:
    """
    Get all time-off entries for multiple employees within a date range.
    
    Args:
        employee_ids: List of employee IDs
        start_date: Start date of the range
        end_date: End date of the range
        db: Database session
    
    Returns:
        Dictionary mapping employee_id to list of time-off entries
    """
    if not db or not employee_ids:
        return {}
    
    query = select(EmployeeTimeOff).where(
        and_(
            EmployeeTimeOff.employee_id.in_(employee_ids),
            EmployeeTimeOff.status == TimeOffStatus.APPROVED,
            or_(
                # Direct date overlap
                and_(
                    EmployeeTimeOff.start_date <= end_date,
                    EmployeeTimeOff.end_date >= start_date
                ),
                # Recurring time-off that might fall in range
                and_(
                    EmployeeTimeOff.is_recurring == True,
                    EmployeeTimeOff.status == TimeOffStatus.APPROVED
                )
            )
        )
    )
    
    time_offs = db.execute(query).scalars().all()
    
    # Group by employee_id
    result = {emp_id: [] for emp_id in employee_ids}
    
    for time_off in time_offs:
        # Check if recurring time-off falls in the date range
        if time_off.is_recurring:
            # Check each year in the range
            for year in range(start_date.year, end_date.year + 1):
                recurring_dates = expand_recurring_time_off(time_off, year)
                for recurring_date in recurring_dates:
                    if start_date <= recurring_date <= end_date:
                        result[time_off.employee_id].append(time_off)
                        break
        else:
            result[time_off.employee_id].append(time_off)
    
    return result

def get_available_employees_for_date(
    place_id: int,
    check_date: date,
    time_range: Optional[Tuple[time, time]] = None,
    db: Session = None
) -> List[int]:
    """
    Get list of available employee IDs for a specific date and time.
    
    Args:
        place_id: ID of the place
        check_date: Date to check
        time_range: Optional time range for partial day checks
        db: Database session
    
    Returns:
        List of available employee IDs
    """
    if not db:
        return []
    
    # Get all active employees for the place
    employees_query = select(PlaceEmployee).where(
        and_(
            PlaceEmployee.place_id == place_id,
            PlaceEmployee.is_active == True
        )
    )
    employees = db.execute(employees_query).scalars().all()
    
    available_employees = []
    
    for employee in employees:
        if check_employee_availability(employee.id, check_date, time_range, db):
            available_employees.append(employee.id)
    
    return available_employees

def calculate_time_off_days(
    start_date: date,
    end_date: date,
    is_full_day: bool = True,
    half_day_period: Optional[str] = None
) -> float:
    """
    Calculate the number of days for a time-off entry.
    
    Args:
        start_date: Start date of time-off
        end_date: End date of time-off
        is_full_day: Whether it's a full day
        half_day_period: 'AM' or 'PM' for half days
    
    Returns:
        Number of days (0.5 for half days)
    """
    if start_date == end_date:
        return 0.5 if not is_full_day else 1.0
    
    # Calculate full days between dates
    days_diff = (end_date - start_date).days + 1
    
    if not is_full_day:
        # For half days, count as 0.5 per day
        return days_diff * 0.5
    
    return float(days_diff)

def get_time_off_summary(
    employee_id: int,
    year: int,
    db: Session = None
) -> Dict[str, Any]:
    """
    Get time-off summary for an employee for a specific year.
    
    Args:
        employee_id: ID of the employee
        year: Year to summarize
        db: Database session
    
    Returns:
        Dictionary with time-off summary statistics
    """
    if not db:
        return {}
    
    # Get all approved time-off for the year
    start_of_year = date(year, 1, 1)
    end_of_year = date(year, 12, 31)
    
    query = select(EmployeeTimeOff).where(
        and_(
            EmployeeTimeOff.employee_id == employee_id,
            EmployeeTimeOff.status == TimeOffStatus.APPROVED,
            or_(
                # Direct time-off in the year
                and_(
                    EmployeeTimeOff.start_date <= end_of_year,
                    EmployeeTimeOff.end_date >= start_of_year
                ),
                # Recurring time-off
                EmployeeTimeOff.is_recurring == True
            )
        )
    )
    
    time_offs = db.execute(query).scalars().all()
    
    summary = {
        'total_days': 0.0,
        'by_type': {},
        'time_offs': []
    }
    
    for time_off in time_offs:
        if time_off.is_recurring:
            # Expand recurring for the year
            recurring_dates = expand_recurring_time_off(time_off, year)
            for recurring_date in recurring_dates:
                days = calculate_time_off_days(
                    recurring_date, 
                    recurring_date, 
                    time_off.is_full_day, 
                    time_off.half_day_period
                )
                summary['total_days'] += days
                summary['by_type'][time_off.time_off_type] = summary['by_type'].get(time_off.time_off_type, 0) + days
        else:
            # Direct time-off
            days = calculate_time_off_days(
                time_off.start_date,
                time_off.end_date,
                time_off.is_full_day,
                time_off.half_day_period
            )
            summary['total_days'] += days
            summary['by_type'][time_off.time_off_type] = summary['by_type'].get(time_off.time_off_type, 0) + days
        
        summary['time_offs'].append(time_off)
    
    return summary

def validate_time_off_request(
    employee_id: int,
    start_date: date,
    end_date: date,
    is_full_day: bool = True,
    half_day_period: Optional[str] = None,
    exclude_id: Optional[int] = None,
    db: Session = None
) -> Tuple[bool, str, List[EmployeeTimeOff]]:
    """
    Validate a time-off request for conflicts and business rules.
    
    Args:
        employee_id: ID of the employee
        start_date: Start date of requested time-off
        end_date: End date of requested time-off
        is_full_day: Whether it's a full day
        half_day_period: 'AM' or 'PM' for half days
        exclude_id: Optional ID to exclude from conflict check
        db: Database session
    
    Returns:
        Tuple of (is_valid, message, conflicting_time_offs)
    """
    if not db:
        return True, "No database session", []
    
    # Check for conflicts
    conflicts = get_conflicting_time_offs(employee_id, start_date, end_date, exclude_id, db)
    
    if conflicts:
        conflict_types = [f"{c.time_off_type} ({c.start_date} - {c.end_date})" for c in conflicts]
        message = f"Time-off conflicts with existing entries: {', '.join(conflict_types)}"
        return False, message, conflicts
    
    # Additional business rules can be added here
    # For example: maximum consecutive days, advance notice requirements, etc.
    
    return True, "Time-off request is valid", []
