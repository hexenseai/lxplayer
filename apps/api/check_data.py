from app.db import engine
from app.models import CompanyTraining, Training, Organization
from sqlmodel import Session, select

def check_data():
    with Session(engine) as session:
        # Check CompanyTraining
        company_trainings = session.exec(select(CompanyTraining)).all()
        print(f"CompanyTraining records: {len(company_trainings)}")
        for ct in company_trainings:
            print(f"  ID: {ct.id}, Access Code: {ct.access_code}, Training ID: {ct.training_id}")
        
        # Check Training
        trainings = session.exec(select(Training)).all()
        print(f"\nTraining records: {len(trainings)}")
        for t in trainings:
            print(f"  ID: {t.id}, Title: {t.title}")
        
        # Check Organization
        orgs = session.exec(select(Organization)).all()
        print(f"\nOrganization records: {len(orgs)}")
        for o in orgs:
            print(f"  ID: {o.id}, Name: {o.name}")

if __name__ == "__main__":
    check_data()
