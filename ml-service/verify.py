import requests, json

tok = requests.post("http://localhost:5000/api/auth/login",
    json={"email":"farmer@vetai360.dev","password":"farmer123"}).json()["token"]

r = requests.post("http://localhost:5000/api/predict/symptoms",
    headers={"Authorization": f"Bearer {tok}"},
    json={
        "animal_type": "Dog", "gender": "Male", "age": 4, "weight": 25,
        "duration": "3 days", "body_temperature": 39.5, "heart_rate": 120,
        "yes_no_symptoms": {"Appetite_Loss":"Yes","Vomiting":"Yes","Diarrhea":"Yes"},
        "symptoms": ["fever","lethargy"]
    })

print("Status:", r.status_code)
data = r.json()
raw  = data.get("raw", data)
print("Diagnosis:     ", raw.get("label"))
print("Confidence:    ", f"{round(raw.get('confidence',0)*100)}%")
print("Urgent:        ", raw.get("is_urgent"))
print("Real data:     ", raw.get("trained_on_real_data"))
print("Recommendation:", raw.get("recommendation","")[:120])
print("\nDifferential:")
for d in raw.get("differential",[])[:5]:
    print(f"  {d['label']}: {round(d['confidence']*100)}%")
