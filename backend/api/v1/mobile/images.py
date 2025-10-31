from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from PIL import Image
import io
import os
import time
from pathlib import Path
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from PIL import ImageDraw
from fastapi.responses import StreamingResponse

from core.database import get_db
from core.dependencies import get_current_user
from core.config import settings
from models.user import User

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path(__file__).parent.parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/optimize")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def optimize_image(
    file: UploadFile = File(...),
    max_width: int = Form(800),
    max_height: int = Form(600),
    quality: int = Form(85),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Optimize image for mobile app (resize and compress)"""
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Validate file size (max 10MB)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")
    
    try:
        # Open image with PIL
        image = Image.open(io.BytesIO(file_content))
        
        # Convert to RGB if necessary (for JPEG)
        if image.mode in ('RGBA', 'LA', 'P'):
            image = image.convert('RGB')
        
        # Calculate new dimensions while maintaining aspect ratio
        original_width, original_height = image.size
        aspect_ratio = original_width / original_height
        
        if original_width > max_width or original_height > max_height:
            if aspect_ratio > 1:  # Landscape
                new_width = min(max_width, original_width)
                new_height = int(new_width / aspect_ratio)
            else:  # Portrait or square
                new_height = min(max_height, original_height)
                new_width = int(new_height * aspect_ratio)
            
            # Resize image
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Save optimized image
        output_buffer = io.BytesIO()
        image.save(output_buffer, format='JPEG', quality=quality, optimize=True)
        optimized_content = output_buffer.getvalue()
        
        # Generate filename
        file_extension = 'jpg'
        filename = f"optimized_{current_user.id}_{file.filename}_{int(time.time())}.{file_extension}"
        file_path = UPLOAD_DIR / filename
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(optimized_content)
        
        return {
            "filename": filename,
            "original_size": len(file_content),
            "optimized_size": len(optimized_content),
            "compression_ratio": round((1 - len(optimized_content) / len(file_content)) * 100, 2),
            "dimensions": {
                "original": {"width": original_width, "height": original_height},
                "optimized": {"width": image.width, "height": image.height}
            },
            "url": f"/api/v1/mobile/images/{filename}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

@router.post("/thumbnail")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def create_thumbnail(
    file: UploadFile = File(...),
    width: int = Form(200),
    height: int = Form(200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create thumbnail image for mobile app"""
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Validate file size (max 5MB for thumbnails)
    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")
    
    try:
        # Open image with PIL
        image = Image.open(io.BytesIO(file_content))
        
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'LA', 'P'):
            # Create white background for transparent images
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        else:
            image = image.convert('RGB')
        
        # Create thumbnail
        image.thumbnail((width, height), Image.Resampling.LANCZOS)
        
        # Save thumbnail
        output_buffer = io.BytesIO()
        image.save(output_buffer, format='JPEG', quality=90, optimize=True)
        thumbnail_content = output_buffer.getvalue()
        
        # Generate filename
        filename = f"thumb_{current_user.id}_{file.filename}_{int(time.time())}.jpg"
        file_path = UPLOAD_DIR / filename
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(thumbnail_content)
        
        return {
            "filename": filename,
            "original_size": len(file_content),
            "thumbnail_size": len(thumbnail_content),
            "dimensions": {
                "width": image.width,
                "height": image.height
            },
            "url": f"/api/v1/mobile/images/{filename}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Thumbnail creation failed: {str(e)}")

@router.get("/{filename}")
@router.head("/{filename}")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_image(
    filename: str
):
    """Get optimized or thumbnail image - public access"""
    # Validate filename (basic security check)
    if not filename or '..' in filename or '/' in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = UPLOAD_DIR / filename
    default_image_path = UPLOAD_DIR / "default_employee.png"

    # Serve the default image if the requested file does not exist
    if not file_path.exists():
        if default_image_path.exists():
            return FileResponse(
                path=str(default_image_path),
                media_type='image/png',
                filename="default_employee.png"
            )
        else:
            # Dynamically generate a simple placeholder PNG if default is missing
            try:
                img_size = (200, 200)
                background_color = (230, 233, 237)  # light gray
                circle_color = (180, 186, 194)      # darker gray

                img = Image.new('RGB', img_size, background_color)
                draw = ImageDraw.Draw(img)
                # Draw a circle avatar
                padding = 20
                draw.ellipse([
                    padding, padding,
                    img_size[0] - padding, img_size[1] - padding
                ], fill=circle_color)

                buffer = io.BytesIO()
                img.save(buffer, format='PNG')
                buffer.seek(0)

                return StreamingResponse(buffer, media_type='image/png')
            except Exception:
                # Final fallback: explicit 404
                raise HTTPException(status_code=404, detail="Image not found")

    # Check if file is an image
    if not file_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
        raise HTTPException(status_code=400, detail="File is not an image")
    
    return FileResponse(
        path=str(file_path),
        media_type='image/jpeg',
        filename=filename
    )

@router.delete("/{filename}")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def delete_image(
    filename: str,
    current_user: User = Depends(get_current_user)
):
    """Delete image file"""
    
    # Validate filename
    if not filename or '..' in filename or '/' in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        # Delete file
        file_path.unlink()
        return {"message": "Image deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")

@router.get("/user/images")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_user_images(
    current_user: User = Depends(get_current_user)
):
    """Get list of user's images"""
    
    try:
        # Get all files in uploads directory that belong to the user
        user_files = []
        for file_path in UPLOAD_DIR.glob(f"*_{current_user.id}_*"):
            if file_path.is_file():
                stat = file_path.stat()
                user_files.append({
                    "filename": file_path.name,
                    "size": stat.st_size,
                    "created_at": stat.st_ctime,
                    "url": f"/api/v1/mobile/images/{file_path.name}"
                })
        
        # Sort by creation time (newest first)
        user_files.sort(key=lambda x: x["created_at"], reverse=True)
        
        return {
            "images": user_files,
            "total": len(user_files)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user images: {str(e)}")
