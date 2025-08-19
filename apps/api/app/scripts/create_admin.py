import os
import sys
from sqlmodel import Session, select

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir, os.pardir))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.db import engine
from app.models import User
from app.auth import hash_password


def run():
    with Session(engine) as session:
        existing = session.exec(select(User).where(User.email == 'admin@admin.com')).first()
        if existing:
            print('Admin already exists')
            return
        user = User(
            email='admin@admin.com',
            username='admin',
            full_name='Admin',
            password=hash_password('123456'),
            role='Admin',
            department='IT',
        )
        session.add(user)
        session.commit()
        print('Admin user created: admin@admin.com / 123456')


if __name__ == '__main__':
    run()
