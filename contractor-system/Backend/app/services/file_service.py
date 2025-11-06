from fastapi import UploadFile, HTTPException, status
from app.config import settings
from app.database import get_supabase
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)


def validate_file(file: UploadFile) -> bool:
    """
    Validate uploaded file

    Args:
        file: Uploaded file

    Returns:
        bool: True if file is valid

    Raises:
        HTTPException: If file is invalid
    """
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_ext} not allowed. Allowed types: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    return True


async def upload_file(file: UploadFile, bucket: str = "public-files", folder: str = "") -> dict:
    """
    Upload file to Supabase Storage

    Args:
        file: File to upload
        bucket: Storage bucket name
        folder: Folder path within bucket

    Returns:
        dict: Upload response with file path and URL
    """
    validate_file(file)

    supabase = get_supabase()

    try:
        # Read file content
        content = await file.read()

        # Check file size
        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE} bytes"
            )

        # Generate file path
        file_path = f"{folder}/{file.filename}" if folder else file.filename

        # Upload to Supabase Storage
        response = supabase.storage.from_(bucket).upload(
            file_path,
            content,
            file_options={"content-type": file.content_type}
        )

        # Get public URL
        public_url = supabase.storage.from_(bucket).get_public_url(file_path)

        logger.info(f"File uploaded successfully: {file_path}")

        return {
            "path": file_path,
            "url": public_url,
            "bucket": bucket,
            "size": len(content),
            "content_type": file.content_type
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file"
        )


async def upload_private_file(file: UploadFile, user_id: str, folder: str = "") -> dict:
    """
    Upload private file to Supabase Storage (user-specific)

    Args:
        file: File to upload
        user_id: User ID for private storage
        folder: Folder path within user's folder

    Returns:
        dict: Upload response with file path
    """
    user_folder = f"users/{user_id}/{folder}" if folder else f"users/{user_id}"
    return await upload_file(file, bucket="private-files", folder=user_folder)


async def create_file_signed_url(file_path: str, bucket: str = "private-files", expires_in: int = 3600) -> str:
    """
    Create signed URL for private file access

    Args:
        file_path: Path to file in storage
        bucket: Storage bucket name
        expires_in: URL expiration time in seconds (default 1 hour)

    Returns:
        str: Signed URL for file access
    """
    supabase = get_supabase()

    try:
        signed_url = supabase.storage.from_(bucket).create_signed_url(
            file_path,
            expires_in
        )

        return signed_url["signedURL"]

    except Exception as e:
        logger.error(f"Error creating signed URL: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create signed URL"
        )


async def delete_file(file_path: str, bucket: str = "public-files") -> bool:
    """
    Delete file from Supabase Storage

    Args:
        file_path: Path to file in storage
        bucket: Storage bucket name

    Returns:
        bool: True if file deleted successfully
    """
    supabase = get_supabase()

    try:
        supabase.storage.from_(bucket).remove([file_path])
        logger.info(f"File deleted successfully: {file_path}")
        return True

    except Exception as e:
        logger.error(f"Error deleting file: {e}", exc_info=True)
        return False
