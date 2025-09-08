# Common Patterns and Solutions

## API Error Handling Pattern

### Backend Pattern
```python
@router.post("/endpoint")
async def endpoint(data: ModelIn, session: Session = Depends(get_session)):
    try:
        # Business logic here
        result = process_data(data)
        session.add(result)
        session.commit()
        return ModelOut.model_validate(result.model_dump())
    except IntegrityError as e:
        session.rollback()
        if "foreign key constraint" in str(e):
            raise HTTPException(400, "Invalid reference ID")
        else:
            raise HTTPException(409, "Duplicate entry")
    except Exception as e:
        session.rollback()
        print(f"DEBUG: Error in endpoint: {e}")
        raise HTTPException(500, "Internal server error")
```

### Frontend Pattern
```typescript
const handleAction = async (formData: FormData) => {
  try {
    const data = {
      field1: formData.get('field1') as string,
      field2: formData.get('field2') as string || undefined,
    };

    await api.someEndpoint(data);
    // Success handling
    alert('Operation successful!');
    loadData(); // Refresh data
  } catch (error) {
    console.error('Error:', error);
    let errorMessage = 'Operation failed';
    if (error instanceof Error) {
      if (error.message.includes('409')) {
        errorMessage = 'Duplicate entry. Please use a different value.';
      } else if (error.message.includes('400')) {
        errorMessage = 'Invalid data. Please check your input.';
      } else if (error.message.includes('403')) {
        errorMessage = 'You do not have permission for this action.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error. Please try again later.';
      }
    }
    alert(errorMessage);
  }
};
```

## Authentication Pattern

### Backend Authentication Check
```python
@router.get("/protected")
async def protected_endpoint(
    current_user: User = Depends(get_current_user)
):
    # Check user role
    if not is_super_admin(current_user):
        raise HTTPException(403, "SuperAdmin access required")
    
    # Check company access
    if not check_company_access(current_user, company_id):
        raise HTTPException(403, "Company access denied")
    
    # Proceed with business logic
    return {"message": "Access granted"}
```

### Frontend Authentication Check
```typescript
const ProtectedComponent = () => {
  const { user, isSuperAdmin, isAdmin } = useUser();
  
  if (!user) {
    return <div>Please log in</div>;
  }
  
  if (!isSuperAdmin && !isAdmin) {
    return <div>Access denied</div>;
  }
  
  return (
    <div>
      {/* Protected content */}
    </div>
  );
};
```

## Database Model Pattern

### SQLModel Definition
```python
class Entity(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    name: str = Field(description="Entity name")
    description: Optional[str] = Field(default=None, description="Entity description")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = Field(default=None, foreign_key="user.id")
    is_active: bool = Field(default=True, description="Whether entity is active")
    
    # Foreign key relationships
    company_id: Optional[str] = Field(default=None, foreign_key="company.id")
```

### Pydantic Schemas
```python
class EntityCreate(BaseModel):
    name: str
    description: Optional[str] = None
    company_id: Optional[str] = None

class EntityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    company_id: Optional[str] = None

class EntityResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    is_active: bool
    company_id: Optional[str] = None
```

## CRUD Operations Pattern

### Backend CRUD
```python
@router.get("/", response_model=List[EntityResponse])
async def list_entities(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List entities based on user permissions"""
    if is_super_admin(current_user):
        entities = session.exec(select(Entity).order_by(Entity.name)).all()
    else:
        entities = session.exec(
            select(Entity).where(Entity.company_id == current_user.company_id)
        ).all()
    
    return [EntityResponse.model_validate(entity.model_dump()) for entity in entities]

@router.post("/", response_model=EntityResponse)
async def create_entity(
    entity_data: EntityCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create new entity"""
    if current_user.role not in ["Admin", "SuperAdmin"]:
        raise HTTPException(403, "Admin access required")
    
    entity = Entity(
        name=entity_data.name,
        description=entity_data.description,
        created_by=current_user.id,
        company_id=entity_data.company_id or current_user.company_id
    )
    
    session.add(entity)
    session.commit()
    session.refresh(entity)
    
    return EntityResponse.model_validate(entity.model_dump())

@router.put("/{entity_id}", response_model=EntityResponse)
async def update_entity(
    entity_id: str,
    entity_data: EntityUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update existing entity"""
    entity = session.get(Entity, entity_id)
    if not entity:
        raise HTTPException(404, "Entity not found")
    
    if not check_company_access(current_user, entity.company_id):
        raise HTTPException(403, "Access denied")
    
    # Update fields
    for field, value in entity_data.model_dump(exclude_unset=True).items():
        setattr(entity, field, value)
    
    entity.updated_at = datetime.utcnow()
    session.add(entity)
    session.commit()
    session.refresh(entity)
    
    return EntityResponse.model_validate(entity.model_dump())

@router.delete("/{entity_id}")
async def delete_entity(
    entity_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete entity"""
    entity = session.get(Entity, entity_id)
    if not entity:
        raise HTTPException(404, "Entity not found")
    
    if not check_company_access(current_user, entity.company_id):
        raise HTTPException(403, "Access denied")
    
    session.delete(entity)
    session.commit()
    
    return {"message": "Entity deleted successfully"}
```

### Frontend CRUD
```typescript
const EntityPage = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  const loadEntities = async () => {
    try {
      setLoading(true);
      const data = await api.listEntities();
      setEntities(data);
    } catch (error) {
      console.error('Error loading entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEntity = async (formData: FormData) => {
    try {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || undefined,
      };

      await api.createEntity(data);
      setShowCreateForm(false);
      loadEntities();
      alert('Entity created successfully!');
    } catch (error) {
      console.error('Error creating entity:', error);
      // Error handling with user-friendly messages
    }
  };

  const handleUpdateEntity = async (formData: FormData) => {
    if (!editingEntity) return;

    try {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || undefined,
      };

      await api.updateEntity(editingEntity.id, data);
      setEditingEntity(null);
      loadEntities();
      alert('Entity updated successfully!');
    } catch (error) {
      console.error('Error updating entity:', error);
      // Error handling
    }
  };

  const handleDeleteEntity = async (entityId: string) => {
    if (!confirm('Are you sure you want to delete this entity?')) return;

    try {
      await api.deleteEntity(entityId);
      loadEntities();
      alert('Entity deleted successfully!');
    } catch (error) {
      console.error('Error deleting entity:', error);
      // Error handling
    }
  };

  useEffect(() => {
    loadEntities();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Entity list and forms */}
    </div>
  );
};
```

## Debug Pattern

### Backend Debug
```python
@router.get("/endpoint")
async def endpoint():
    print(f"DEBUG: Endpoint called")
    try:
        # Add debug prints at key points
        print(f"DEBUG: Processing request")
        result = process_request()
        print(f"DEBUG: Success - {len(result)} items")
        return result
    except Exception as e:
        print(f"DEBUG: Error - {e}")
        print(f"DEBUG: Error type - {type(e)}")
        import traceback
        print(f"DEBUG: Traceback - {traceback.format_exc()}")
        raise
```

### Frontend Debug
```typescript
const handleAction = async () => {
  console.log('DEBUG: Action started');
  try {
    console.log('DEBUG: Making API call');
    const result = await api.someEndpoint();
    console.log('DEBUG: API response:', result);
    // Process result
  } catch (error) {
    console.error('DEBUG: Error occurred:', error);
    console.error('DEBUG: Error details:', {
      message: error.message,
      status: error.status,
      stack: error.stack
    });
    // Handle error
  }
};
```

## Testing Pattern

### API Testing
```powershell
# Get authentication token
$loginData = @{
    username = "superadmin@example.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -Body $loginData -ContentType "application/json"
$token = $response.access_token

# Test endpoint
$headers = @{
    "Authorization" = "Bearer $token"
}

$result = Invoke-RestMethod -Uri "http://localhost:8000/endpoint" -Method GET -Headers $headers
Write-Host "Result: $($result | ConvertTo-Json -Depth 3)"
```

### Database Testing
```python
# Test database connection and queries
from app.db import get_session
from app.models import Entity

session = next(get_session())
try:
    entities = session.exec(select(Entity)).all()
    print(f"Found {len(entities)} entities")
    for entity in entities:
        print(f"- {entity.name}")
finally:
    session.close()
```

## Migration Pattern

### Creating Migrations
```bash
# Generate migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Migration File Structure
```python
def upgrade() -> None:
    # Add columns
    op.add_column('table_name', sa.Column('new_column', sa.String(), nullable=True))
    
    # Create foreign keys
    op.create_foreign_key('fk_name', 'table_name', 'referenced_table', ['column'], ['id'])
    
    # Drop old columns
    op.drop_column('table_name', 'old_column')

def downgrade() -> None:
    # Reverse operations
    op.add_column('table_name', sa.Column('old_column', sa.String(), nullable=True))
    op.drop_constraint('fk_name', 'table_name', type_='foreignkey')
    op.drop_column('table_name', 'new_column')
```

## Error Message Patterns

### User-Friendly Messages
```typescript
const getErrorMessage = (error: Error): string => {
  if (error.message.includes('409')) {
    return 'This item already exists. Please use a different name.';
  } else if (error.message.includes('400')) {
    return 'Invalid data. Please check your input and try again.';
  } else if (error.message.includes('403')) {
    return 'You do not have permission to perform this action.';
  } else if (error.message.includes('404')) {
    return 'The requested item was not found.';
  } else if (error.message.includes('500')) {
    return 'Server error. Please try again later.';
  } else {
    return 'An unexpected error occurred. Please try again.';
  }
};
```

### Backend Error Responses
```python
# Specific error messages
raise HTTPException(400, "Invalid input data")
raise HTTPException(403, "Insufficient permissions")
raise HTTPException(404, "Resource not found")
raise HTTPException(409, "Duplicate entry")
raise HTTPException(500, "Internal server error")
```
