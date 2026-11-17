from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.category import Category
from app.models.user import User, Role
from app.core.permissions import get_current_user, require_admin
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate, SubAdminBrief

router = APIRouter()


@router.get("", response_model=List[CategoryOut])
def list_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cats = db.query(Category).all()
    result = []
    for cat in cats:
        c = CategoryOut.model_validate(cat)
        c.sub_admin_count = len(cat.sub_admins)
        result.append(c)
    return result


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(
    body: CategoryCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(Category).filter(Category.name == body.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    cat = Category(
        name=body.name,
        description=body.description,
        default_sub_admin_id=body.default_sub_admin_id,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    result = CategoryOut.model_validate(cat)
    result.sub_admin_count = 0
    return result


@router.put("/{cat_id}", response_model=CategoryOut)
def update_category(
    cat_id: int,
    body: CategoryUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    cat = db.get(Category, cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if body.name is not None:
        cat.name = body.name
    if body.description is not None:
        cat.description = body.description
    if body.default_sub_admin_id is not None:
        cat.default_sub_admin_id = body.default_sub_admin_id
    db.commit()
    db.refresh(cat)
    result = CategoryOut.model_validate(cat)
    result.sub_admin_count = len(cat.sub_admins)
    return result


@router.get("/{cat_id}/sub_admins", response_model=List[SubAdminBrief])
def list_sub_admins(
    cat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cat = db.get(Category, cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat.sub_admins
