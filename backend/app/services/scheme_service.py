# backend/app/services/scheme_service.py
from typing import List, Dict, Any, Optional
from app.database.database import db
from app.utils.logger import app_logger

# ──────────────────────────────────────────────────────────────────────────────
# Initial Seed Data — 100% Verified Government Schemes
# ──────────────────────────────────────────────────────────────────────────────

VERIFIED_SCHEMES: List[Dict[str, Any]] = [
    {
        "id": "udid_card",
        "name": {
            "en": "Unique Disability ID (UDID) Card & Disability Certificate",
            "ta": "தனித்துவ மாற்றுத்திறனாளி அடையாள அட்டை (UDID) & சான்றிதழ்"
        },
        "shortDescription": {
            "en": "National unified disability certificate and identity card enabling seamless access to government welfare, travel concessions, and healthcare benefits.",
            "ta": "அரசு நலத்திட்டங்கள், பயணச் சலுகைகள் மற்றும் மருத்துவ உதவியைப் பெறுவதற்கான தேசிய ஒருங்கிணைந்த மாற்றுத்திறனாளி அடையாள அட்டை."
        },
        "category": "certification",
        "governmentLevel": "central",
        "department": {
            "en": "Department of Empowerment of Persons with Disabilities (DEPwD), Ministry of Social Justice & Empowerment",
            "ta": "மாற்றுத்திறனாளிகள் நலத்துறை (DEPwD), சமூக நீதி மற்றும் அதிகாரமளித்தல் அமைச்சகம்"
        },
        "eligibility": {
            "en": [
                "Person with 40% or more benchmark disability certified by a competent medical authority.",
                "Indian citizen of any age.",
                "Covers Hearing Impairment, Speech and Language Disability, Locomotor Disability, Visual Impairment, and multiple disabilities."
            ],
            "ta": [
                "தகுதியான மருத்துவ அதிகாரி அளித்த 40% அல்லது அதற்கு மேற்பட்ட மாற்றுத்திறன் சான்றிதழ் கொண்டவர்.",
                "எந்த வயதிலும் உள்ள இந்தியக் குடிமகன்.",
                "செவித்திறன் குறைபாடு, பேச்சு மற்றும் மொழி குறைபாடு, உடலியக்க குறைபாடு, பார்வை குறைபாடு கொண்டவர்கள் தகுதியானவர்கள்."
            ]
        },
        "benefits": {
            "en": [
                "Single nationwide digital Identity Card for all Government services and schemes.",
                "No need to carry multiple physical certificates across states.",
                "Direct eligibility for bus/rail travel concessions and reservation benefits.",
                "Streamlined access to ADIP, scholarships, and pension schemes."
            ],
            "ta": [
                "அனைத்து அரசு சேவைகள் மற்றும் திட்டங்களுக்கும் ஒற்றை தேசிய டிஜிட்டல் அடையாள அட்டை.",
                "வெவ்வேறு மாநிலங்களில் பல அச்சிடப்பட்ட சான்றிதழ்களை எடுத்துச் செல்ல வேண்டிய அவசியமில்லை.",
                "பேருந்து மற்றும் ரயில் பயணச் சலுகைகளுக்கான நேரடித் தகுதி.",
                "ADIP, கல்வி உதவித்தொகை மற்றும் ஓய்வூதியத் திட்டங்களுக்கான எளிதான அணுகல்."
            ]
        },
        "documents": {
            "en": [
                "Recent Passport Size Photograph",
                "Proof of Identity (Aadhaar Card / Voter ID / Passport)",
                "Proof of Address (Aadhaar Card / Ration Card / Utility Bill)",
                "Existing Disability Certificate (if issued previously by Medical Board)"
            ],
            "ta": [
                "சமீபத்திய பாஸ்போர்ட் அளவு புகைப்படம்",
                "அடையாளச் சான்று (ஆதார் அட்டை / வாக்காளர் அடையாள அட்டை / பாஸ்போர்ட்)",
                "முகவரிச் சான்று (ஆதார் அட்டை / ரேஷன் கார்டு)",
                "முந்தைய மருத்துவ வாரிய மாற்றுத்திறன் சான்றிதழ் (இருப்பின்)"
            ]
        },
        "applicationSteps": {
            "en": [
                "Visit the official Swavlamban Card portal: https://www.swavlambancard.gov.in/",
                "Click on 'Apply for Disability Certificate & UDID Card'.",
                "Fill in Personal Details, Address, Disability Details, and Employment status.",
                "Upload photo, signature/thumb impression, and address proof.",
                "Submit the application and download the Application Reference Number.",
                "Visit designated Government Hospital for Medical Board assessment upon notification."
            ],
            "ta": [
                "அதிகாரப்பூர்வ Swavlamban போர்ட்டலுக்குச் செல்லவும்: https://www.swavlambancard.gov.in/",
                "'Apply for Disability Certificate & UDID Card' என்பதை கிளிக் செய்யவும்.",
                "தனிப்பட்ட விவரங்கள், முகவரி மற்றும் மாற்றுத்திறன் விவரங்களை பூர்த்தி செய்யவும்.",
                "புகைப்படம் மற்றும் முகவரிச் சான்றைப் பதிவேற்றவும்.",
                "விண்ணப்பத்தை சமர்ப்பித்து குறிப்பு எண்ணைப் பதிவிறக்கவும்.",
                "மருத்துவ வாரியப் பரிசோதனைக்காக குறிப்பிட்ட அரசு மருத்துவமனைக்குச் செல்லவும்."
            ]
        },
        "applicableDisabilities": {
            "en": [
                "Hearing Impairment (Deaf and Hard of Hearing)",
                "Speech and Language Disability",
                "Locomotor Disability",
                "Visual Impairment",
                "Multiple Disabilities"
            ],
            "ta": [
                "செவித்திறன் குறைபாடு (காது கேளாதோர்)",
                "பேச்சு மற்றும் மொழி குறைபாடு",
                "உடலியக்க குறைபாடு",
                "பார்வை குறைபாடு",
                "பல்வேறு மாற்றுத்திறன்கள்"
            ]
        },
        "officialInfoUrl": "https://www.swavlambancard.gov.in/",
        "officialApplyUrl": "https://www.swavlambancard.gov.in/pwd/application",
        "sourceName": "Unique Disability ID Portal, DEPwD, Government of India",
        "lastVerifiedAt": "2026-07-21",
        "status": "Active / Application Open",
        "importantDates": {
            "en": "Applications remain open continuously throughout the year.",
            "ta": "ஆண்டு முழுவதும் விண்ணப்பங்கள் தொடர்ந்து திறந்திருக்கும்."
        }
    },
    {
        "id": "adip_scheme",
        "name": {
            "en": "ADIP Scheme — Assistance to Disabled Persons for Purchase/Fitting of Aids and Appliances",
            "ta": "ADIP திட்டம் — மாற்றுத்திறனாளிகளுக்கான உதவி உபகரணங்கள் வழங்கும் திட்டம்"
        },
        "shortDescription": {
            "en": "Free or subsidized high-quality assistive devices, digital hearing aids, and mobility appliances to reduce physical and communication barriers.",
            "ta": "செவித்திறன் கருவிகள், டிஜிட்டல் உதவி உபகரணங்கள் மற்றும் இயக்கம் தொடர்பான உதவிகளை இலவசமாக அல்லது மானிய விலையில் வழங்கும் திட்டம்."
        },
        "category": "assistive_devices",
        "governmentLevel": "central",
        "department": {
            "en": "Department of Empowerment of Persons with Disabilities (DEPwD), MoSJE & ALIMCO",
            "ta": "மாற்றுத்திறனாளிகள் நலத்துறை (DEPwD) & ALIMCO நிறுவனம்"
        },
        "eligibility": {
            "en": [
                "Indian citizen with valid Disability Certificate / UDID Card (40%+ disability).",
                "Monthly income from all sources not exceeding ₹22,500/- per month for 100% subsidy.",
                "For monthly income between ₹22,501/- and ₹30,000/-, 50% subsidy is provided.",
                "Must not have received similar assistance from Government/NGO in the last 3 years (1 year for children up to 12 years)."
            ],
            "ta": [
                "செல்லுபடியாகும் மாற்றுத்திறன் சான்றிதழ் / UDID அட்டை கொண்ட இந்தியக் குடிமகன்.",
                "100% இலவச உதவிக்கு குடும்ப மாத வருமானம் ₹22,500/ க்கு மிகாமல் இருக்க வேண்டும்.",
                "மாத வருமானம் ₹22,501 முதல் ₹30,000 வரை இருப்பின் 50% மானியம் வழங்கப்படும்.",
                "கடந்த 3 ஆண்டுகளில் அரசு/தன்னார்வ தொண்டு நிறுவனத்திடம் உதவி பெற்றிருக்கக் கூடாது."
            ]
        },
        "benefits": {
            "en": [
                "Free or subsidized digital Behind-The-Ear (BTE) hearing aids for hearing impaired beneficiaries.",
                "Cochlear Implant surgery for eligible hearing-impaired children up to 6 years of age (up to ₹6 Lakhs support).",
                "Prosthetics, wheelchairs, educational kits, and specialized assistive technology tools."
            ],
            "ta": [
                "செவித்திறன் குறைபாடுள்ளவர்களுக்கு இலவச அல்லது மானிய விலையிலான டிஜிட்டல் காது கேட்கும் கருவிகள்.",
                "6 வயது வரையிலான குழந்தைகளுக்கு காது உட்செவி பெருக்கி (Cochlear Implant) அறுவை சிகிச்சை உதவி (₹6 லட்சம் வரை).",
                "சக்கர நாற்காலிகள், செயற்கை உறுப்புகள் மற்றும் சிறப்பு உதவி தொழில்நுட்பக் கருவிகள்."
            ]
        },
        "documents": {
            "en": [
                "Disability Certificate / UDID Card",
                "Income Certificate issued by competent authority (Tahsildar/Gazetted Officer)",
                "Residence Proof (Aadhaar / Ration Card)",
                "Audiogram Report (for hearing aid seekers)"
            ],
            "ta": [
                "மாற்றுத்திறன் சான்றிதழ் / UDID அட்டை",
                "தாசில்தார் வழங்கிய குடும்ப வருமானச் சான்றிதழ்",
                "இருப்பிடச் சான்று (ஆதார் / ரேஷன் கார்டு)",
                "காது கேட்டல் பரிசோதனை அறிக்கை (Audiogram Report)"
            ]
        },
        "applicationSteps": {
            "en": [
                "Visit the official ADIP portal: https://adip.depwd.gov.in/",
                "Check schedule for upcoming ALIMCO / District Disability Rehabilitation Centre (DDRC) assessment camps.",
                "Submit application directly at DDRC or during official Assessment Camps organized in your district.",
                "Upon audiometric evaluation, modern hearing aid or device is fitted and provided."
            ],
            "ta": [
                "அதிகாரப்பூர்வ ADIP போர்ட்டலைப் பார்வையிடவும்: https://adip.depwd.gov.in/",
                "மாவட்ட மறுவாழ்வு மையங்களில் (DDRC) நடைபெறும் சிறப்பு முகாம்களைத் தெரிந்துகொள்ளவும்.",
                "DDRC மையம் அல்லது மாவட்ட முகாம்களில் விண்ணப்பத்தை சமர்ப்பிக்கவும்.",
                "செவித்திறன் பரிசோதனைக்கு பின் பொருத்தமான உதவி கருவி வழங்கப்படும்."
            ]
        },
        "applicableDisabilities": {
            "en": [
                "Hearing Impairment",
                "Speech and Language Disability",
                "Locomotor Disability",
                "Visual Impairment"
            ],
            "ta": [
                "செவித்திறன் குறைபாடு",
                "பேச்சு மற்றும் மொழி குறைபாடு",
                "உடலியக்க குறைபாடு",
                "பார்வை குறைபாடு"
            ]
        },
        "officialInfoUrl": "https://adip.depwd.gov.in/",
        "officialApplyUrl": "https://adip.depwd.gov.in/",
        "sourceName": "DEPwD Ministry of Social Justice & Empowerment, Govt of India",
        "lastVerifiedAt": "2026-07-21",
        "status": "Active / Camps Check Recommended",
        "importantDates": {
            "en": "Assessment and distribution camps are held throughout the year in coordination with district collectors.",
            "ta": "மாவட்ட ஆட்சியர் அலுவலகங்கள் மூலம் ஆண்டு முழுவதும் மதிப்பீட்டு முகாம்கள் நடத்தப்படுகின்றன."
        }
    },
    {
        "id": "pre_matric_scholarship",
        "name": {
            "en": "Pre-Matric Scholarship for Students with Disabilities",
            "ta": "மாற்றுத்திறனாளி மாணவர்களுக்கான மெட்ரிக் முன்பருவ உதவித்தொகை"
        },
        "shortDescription": {
            "en": "Financial educational scholarship for disabled students studying in Class IX and X to prevent dropout and promote secondary education.",
            "ta": "9 மற்றும் 10 ஆம் வகுப்பு படிக்கும் மாற்றுத்திறனாளி மாணவர்களின் பள்ளிப் படிப்பை ஊக்குவிக்க வழங்கப்படும் கல்வி உதவித்தொகை."
        },
        "category": "education",
        "governmentLevel": "central",
        "department": {
            "en": "Department of Empowerment of Persons with Disabilities & National Scholarship Portal (NSP)",
            "ta": "மாற்றுத்திறனாளிகள் நலத்துறை & தேசிய உதவித்தொகை இணையதளம் (NSP)"
        },
        "eligibility": {
            "en": [
                "Regular student in Class IX or X in a recognized Government or Private school.",
                "40% or more disability certified by competent medical authority / UDID.",
                "Annual parental/guardian income should not exceed ₹2,50,000/- per annum.",
                "Only two children with disability in a family can avail benefits."
            ],
            "ta": [
                "அங்கீகரிக்கப்பட்ட பள்ளியில் 9 அல்லது 10 ஆம் வகுப்பில் படிக்கும் முறைசார் மாணவர்.",
                "40% அல்லது அதற்கு மேற்பட்ட மாற்றுத்திறன் சான்றிதழ் / UDID கொண்டிருக்க வேண்டும்.",
                "பெற்றோரின் ஆண்டு வருமானம் ₹2,50,000/- க்கு மிகாமல் இருக்க வேண்டும்.",
                "ஒரு குடும்பத்தில் அதிகபட்சம் இரு குழந்தைகள் மட்டுமே பெற முடியும்."
            ]
        },
        "benefits": {
            "en": [
                "Maintenance allowance of ₹500/- per month for day scholars (10 months per year).",
                "Maintenance allowance of ₹850/- per month for hostellers.",
                "Disability allowance of ₹2,000 to ₹4,000 per annum depending on disability category.",
                "Direct Bank Transfer (DBT) directly into student/parent Aadhaar-linked account."
            ],
            "ta": [
                "நாள் மாணவர்களுக்கு மாதம் ₹500/- பராமரிப்பு உதவித்தொகை (ஆண்டுக்கு 10 மாதங்கள்).",
                "விடுதி மாணவர்களுக்கு மாதம் ₹850/- பராமரிப்பு உதவித்தொகை.",
                "ஆண்டுதோறும் ₹2,000 முதல் ₹4,000 வரை சிறப்பு மாற்றுத்திறன் கொடுப்பனவு.",
                "வங்கிக் கணக்கிற்கு நேரடியாக டிபிடி (DBT) மூலம் பணம் அனுப்பப்படும்."
            ]
        },
        "documents": {
            "en": [
                "Student's Aadhaar Card & Bank Account Passbook",
                "Valid Disability Certificate / UDID Card",
                "Income Certificate of parents",
                "Previous Class Marksheet",
                "Bonafide Student Certificate from School"
            ],
            "ta": [
                "மாணவரின் ஆதார் அட்டை & வங்கி கணக்கு புத்தகம்",
                "செல்லுபடியாகும் மாற்றுத்திறன் சான்றிதழ் / UDID",
                "பெற்றோரின் வருமானச் சான்றிதழ்",
                "முந்தைய வகுப்பு மதிப்பெண் சான்றிதழ்",
                "பள்ளி சான்றொப்ப சான்றிதழ் (Bonafide Certificate)"
            ]
        },
        "applicationSteps": {
            "en": [
                "Visit National Scholarship Portal: https://scholarships.gov.in/",
                "Register on OTR (One Time Registration) using Aadhaar.",
                "Select 'Pre-Matric Scholarship for Students with Disabilities' under Ministry of Social Justice.",
                "Fill educational and bank details and upload required certificates.",
                "Submit form for School verification and District Welfare Officer approval."
            ],
            "ta": [
                "தேசிய உதவித்தொகை இணையதளத்தைப் பார்வையிடவும்: https://scholarships.gov.in/",
                "ஆதார் மூலம் OTR (ஒருமுறை பதிவு) செய்து கொள்ளவும்.",
                "சமூக நீதி அமைச்சகத்தின் கீழ் 'Pre-Matric Scholarship for Students with Disabilities' என்பதைத் தேர்ந்தெடுக்கவும்.",
                "கல்வி மற்றும் வங்கி விவரங்களை பூர்த்தி செய்து சான்றிதழ்களை பதிவேற்றவும்.",
                "பள்ளி மற்றும் மாவட்ட அதிகாரிகளின் சரிபார்ப்பிற்கு சமர்ப்பிக்கவும்."
            ]
        },
        "applicableDisabilities": {
            "en": [
                "Hearing Impairment",
                "Speech & Language Impairment",
                "Locomotor Disability",
                "Visual Impairment",
                "Intellectual & Learning Disabilities"
            ],
            "ta": [
                "செவித்திறன் குறைபாடு",
                "பேச்சு மற்றும் மொழி குறைபாடு",
                "உடலியக்க குறைபாடு",
                "பார்வை குறைபாடு",
                "கற்றல் குறைபாடு"
            ]
        },
        "officialInfoUrl": "https://scholarships.gov.in/",
        "officialApplyUrl": "https://scholarships.gov.in/",
        "sourceName": "National Scholarship Portal (NSP), Govt of India",
        "lastVerifiedAt": "2026-07-21",
        "status": "Check official portal for current availability",
        "importantDates": {
            "en": "Applications generally open between August and October each academic year. Check NSP portal.",
            "ta": "ஒவ்வொரு கல்வியாண்டும் ஆகஸ்ட் முதல் அக்டோபர் வரை விண்ணப்பங்கள் பெறப்படும். NSP போர்ட்டலை சரிபார்க்கவும்."
        }
    },
    {
        "id": "post_matric_scholarship",
        "name": {
            "en": "Post-Matric Scholarship for Students with Disabilities",
            "ta": "மாற்றுத்திறனாளி மாணவர்களுக்கான மெட்ரிக் பிந்தைய உதவித்தொகை"
        },
        "shortDescription": {
            "en": "Financial assistance for pursuing post-secondary education (Class XI, XII, Diploma, UG, PG, ITI) in recognized institutions.",
            "ta": "11ஆம் வகுப்பு முதல் பட்டப்படிப்பு, பட்டமேற்படிப்பு மற்றும் தொழிற்கல்வி படிக்கும் மாற்றுத்திறனாளி மாணவர்களுக்கான கல்வி உதவித்தொகை."
        },
        "category": "education",
        "governmentLevel": "central",
        "department": {
            "en": "Department of Empowerment of Persons with Disabilities & National Scholarship Portal",
            "ta": "மாற்றுத்திறனாளிகள் நலத்துறை & தேசிய உதவித்தொகை போர்ட்டல்"
        },
        "eligibility": {
            "en": [
                "Pursuing post-matriculation courses (Class 11, 12, ITI, Diploma, Bachelor Degree, Master Degree).",
                "40% or higher disability certified by Medical Board / UDID.",
                "Parental annual income not exceeding ₹2,50,000/- per annum."
            ],
            "ta": [
                "11, 12ம் வகுப்பு, ஐடிஐ, டிப்ளமோ, இளங்கலை, முதுகலை பயிலும் மாணவர்கள்.",
                "40% அல்லது அதற்கு மேற்பட்ட மாற்றுத்திறன் சான்றிதழ் / UDID இருத்தல் வேண்டும்.",
                "பெற்றோரின் ஆண்டு வருமானம் ₹2,50,000/- க்கு மிகாமல் இருக்க வேண்டும்."
            ]
        },
        "benefits": {
            "en": [
                "Maintenance allowance up to ₹1,600/- per month for hostellers and ₹750/- per month for day scholars.",
                "Full reimbursement of compulsory non-refundable fees charged by institutions.",
                "Disability allowance for reader charges, escort allowance, and book grant."
            ],
            "ta": [
                "விடுதி மாணவர்களுக்கு மாதம் ₹1,600/- வரையிலும், நாள் மாணவர்களுக்கு ₹750/- வரையிலும் பராமரிப்பு உதவித்தொகை.",
                "கல்வி நிறுவனக் கட்டணங்கள் முழுமையாக திருப்பித் தரப்படும்.",
                "வாசிப்பாளர் மற்றும் உதவியாளர் செலவுகளுக்கான சிறப்பு கொடுப்பனவு."
            ]
        },
        "documents": {
            "en": [
                "UDID Card / Disability Certificate",
                "Income Certificate of parents",
                "College/Institute Bonafide Certificate & Fee Receipt",
                "Aadhaar Card linked with Bank Account"
            ],
            "ta": [
                "UDID அட்டை / மாற்றுத்திறன் சான்றிதழ்",
                "பெற்றோரின் வருமானச் சான்றிதழ்",
                "கல்லூரி சேர்க்கை மற்றும் கட்டண ரசீது",
                "வங்கிக் கணக்கு இணைக்கப்பட்ட ஆதார் அட்டை"
            ]
        },
        "applicationSteps": {
            "en": [
                "Visit National Scholarship Portal: https://scholarships.gov.in/",
                "Log in using OTR and select 'Post-Matric Scholarship for Students with Disabilities'.",
                "Fill educational details, fee receipts, and bank account info.",
                "Submit online application for Institute verification."
            ],
            "ta": [
                "NSP போர்ட்டலுக்குச் செல்லவும்: https://scholarships.gov.in/",
                "OTR மூலம் உள்நுழைந்து 'Post-Matric Scholarship for Students with Disabilities' என்பதைத் தேர்ந்தெடுக்கவும்.",
                "கல்வி விவரங்கள் மற்றும் கட்டண ரசீதுகளை பதிவேற்றி சமர்ப்பிக்கவும்."
            ]
        },
        "applicableDisabilities": {
            "en": [
                "Hearing Impairment",
                "Speech Impairment",
                "Locomotor Disability",
                "Visual Impairment",
                "All Benchmark Disabilities"
            ],
            "ta": [
                "செவித்திறன் குறைபாடு",
                "பேச்சு குறைபாடு",
                "உடலியக்க குறைபாடு",
                "பார்வை குறைபாடு",
                "அனைத்து மாற்றுத்திறன்கள்"
            ]
        },
        "officialInfoUrl": "https://scholarships.gov.in/",
        "officialApplyUrl": "https://scholarships.gov.in/",
        "sourceName": "National Scholarship Portal (NSP), Govt of India",
        "lastVerifiedAt": "2026-07-21",
        "status": "Check official portal for current availability",
        "importantDates": {
            "en": "Check NSP Portal for current academic session application opening dates.",
            "ta": "தற்போதைய கல்வியாண்டின் விண்ணப்பத் தேதிகளை NSP போர்ட்டலில் சரிபார்க்கவும்."
        }
    },
    {
        "id": "nhfdc_loans",
        "name": {
            "en": "NHFDC Concessional Loans & Self-Employment Assistance for PwDs",
            "ta": "NHFDC மாற்றுத்திறனாளிகளுக்கான குறைந்த வட்டி சுயதொழில் கடன் திட்டம்"
        },
        "shortDescription": {
            "en": "Low-interest loans and financial assistance for establishing small businesses, service units, agricultural activities, or higher professional education.",
            "ta": "சுயதொழில், சிறு தொழில், விவசாயம் மற்றும் உயர்கல்விக்காக மிக குறைந்த வட்டியில் வழங்கப்படும் கடன் திட்டம்."
        },
        "category": "employment",
        "governmentLevel": "central",
        "department": {
            "en": "National Handicapped Finance and Development Corporation (NHFDC)",
            "ta": "தேசிய மாற்றுத்திறனாளிகள் நிதி மற்றும் மேம்பாட்டு நிறுவனம் (NHFDC)"
        },
        "eligibility": {
            "en": [
                "Indian citizen with 40% or more disability.",
                "Age between 18 and 60 years.",
                "Relevant vocational training or background in the proposed business field is preferred."
            ],
            "ta": [
                "40% அல்லது அதற்கு மேற்பட்ட மாற்றுத்திறன் கொண்ட இந்தியக் குடிமகன்.",
                "18 முதல் 60 வயது வரை இருக்க வேண்டும்.",
                "தொடங்க உத்தேசித்துள்ள தொழில் சார்ந்த தொழிற்பயிற்சி பெற்றிருப்பது சிறந்தது."
            ]
        },
        "benefits": {
            "en": [
                "Concessional loan up to ₹25.00 Lakhs for business/service sector at nominal interest rates (4% to 9% p.a.).",
                "Higher rebate on interest for women entrepreneurs with disabilities.",
                "Education loans up to ₹10 Lakhs in India and ₹20 Lakhs abroad at concessional rates."
            ],
            "ta": [
                "வியாபாரம் மற்றும் சேவைத் துறைகளுக்கு ₹25 லட்சம் வரை குறைந்த வட்டி விகிதத்தில் (ஆண்டுக்கு 4% - 9%) கடன்.",
                "பெண் தொழில்முனைவோருக்கு கூடுதல் வட்டித் தள்ளுபடி.",
                "உயர்கல்விக்கு ₹10 லட்சம் முதல் ₹20 லட்சம் வரை குறைந்த வட்டியில் கடன்."
            ]
        },
        "documents": {
            "en": [
                "Disability Certificate / UDID Card",
                "Proof of Identity & Residence (Aadhaar / Voter ID)",
                "Detailed Business Project Proposal / Feasibility Report",
                "Quotation for machinery/equipment to be purchased"
            ],
            "ta": [
                "மாற்றுத்திறன் சான்றிதழ் / UDID அட்டை",
                "அடையாளம் மற்றும் இருப்பிடச் சான்று",
                "தொழில் திட்ட அறிக்கை (Business Project Report)",
                "இயந்திரங்கள் மற்றும் உபகரணங்கள் வாங்குவதற்கான விலைப்பட்டியல் (Quotation)"
            ]
        },
        "applicationSteps": {
            "en": [
                "Visit NHFDC official portal: https://www.nhfdc.nic.in/",
                "Download loan application form or contact State Channelizing Agency (SCA) / Regional Rural Banks.",
                "Submit project proposal along with required documents to the nearest State Channelizing Agency.",
                "After appraisal and approval, loan funds are disbursed directly."
            ],
            "ta": [
                "NHFDC அதிகாரப்பூர்வ தளத்தைப் பார்வையிடவும்: https://www.nhfdc.nic.in/",
                "மாநிலச் சேனலைசிங் முகமை (SCA) அல்லது பொதுத்துறை வங்கிகளை அணுகவும்.",
                "தொழில் திட்ட அறிக்கையை ஆவணங்களுடன் சமர்ப்பிக்கவும்.",
                "சரிபார்ப்பிற்கு பின் கடன் தொகை வழங்கப்படும்."
            ]
        },
        "applicableDisabilities": {
            "en": [
                "Hearing Impairment",
                "Speech Disability",
                "Locomotor Disability",
                "Visual Impairment",
                "All Benchmark Disabilities"
            ],
            "ta": [
                "செவித்திறன் குறைபாடு",
                "பேச்சு குறைபாடு",
                "உடலியக்க குறைபாடு",
                "பார்வை குறைபாடு",
                "அனைத்து மாற்றுத்திறன்கள்"
            ]
        },
        "officialInfoUrl": "https://www.nhfdc.nic.in/",
        "officialApplyUrl": "https://www.nhfdc.nic.in/",
        "sourceName": "NHFDC Ministry of Social Justice and Empowerment, Govt of India",
        "lastVerifiedAt": "2026-07-21",
        "status": "Active / Application Open",
        "importantDates": {
            "en": "Loan applications can be submitted throughout the year through State Channelizing Agencies.",
            "ta": "ஆண்டு முழுவதும் மாநில முகமைகள் மூலம் விண்ணப்பங்களைச் சமர்ப்பிக்கலாம்."
        }
    },
    {
        "id": "tn_maintenance_allowance",
        "name": {
            "en": "Tamil Nadu Monthly Maintenance Allowance for Differently Abled Persons",
            "ta": "தமிழ்நாடு மாற்றுத்திறனாளிகளுக்கான மாதாந்திர பராமரிப்பு உதவித்தொகை திட்டம்"
        },
        "shortDescription": {
            "en": "State government financial pension of ₹2,000/- per month for persons with severe disabilities, severe hearing/speech loss, or spinal injuries.",
            "ta": "கடுமையான மாற்றுத்திறன், செவித்திறன் குறைபாடு உள்ளவர்களுக்கு தமிழக அரசு வழங்கும் மாதம் ₹2,000/- பராமரிப்பு உதவித்தொகை."
        },
        "category": "financial",
        "governmentLevel": "state_tn",
        "department": {
            "en": "Commissionerate for Welfare of the Differently Abled, Government of Tamil Nadu",
            "ta": "மாற்றுத்திறனாளிகள் நல ஆணையரகம், தமிழ்நாடு அரசு"
        },
        "eligibility": {
            "en": [
                "Resident of Tamil Nadu with 40% or more severe disability (including hearing & speech disability, locomotor, cerebral palsy).",
                "Unemployed or incapable of engaging in gainful employment.",
                "Income limit as prescribed by TN State Welfare Board guidelines."
            ],
            "ta": [
                "40% அல்லது அதற்கு மேற்பட்ட மாற்றுத்திறன் கொண்ட தமிழ்நாடு வாழ் மக்கள்.",
                "சுயதொழில் செய்ய இயலாத அல்லது வேலைவாய்ப்பற்ற சூழலில் உள்ளவர்கள்.",
                "தமிழக அரசு நிர்ணயித்துள்ள வருமான வரம்பிற்கு உட்பட்டவர்கள்."
            ]
        },
        "benefits": {
            "en": [
                "Monthly pension allowance of ₹2,000/- deposited directly into beneficiary's bank account.",
                "Financial security for basic medical care and living expenses."
            ],
            "ta": [
                "மாதம்தோறும் ₹2,000/- பராமரிப்பு உதவித்தொகை நேரடியாக வங்கிக் கணக்கில் வழங்கப்படும்.",
                "அடிப்படை வாழ்வாதாரம் மற்றும் மருத்துவத் தேவைகளுக்கான நிதிப் பாதுகாப்பு."
            ]
        },
        "documents": {
            "en": [
                "National Disability Identity Card (UDID) / Medical Certificate",
                "Ration Card / Smart Card of Tamil Nadu",
                "Aadhaar Card",
                "Bank Passbook first page copy"
            ],
            "ta": [
                "தேசிய மாற்றுத்திறனாளி அடையாள அட்டை (UDID) / மருத்துவ சான்றிதழ்",
                "தமிழ்நாடு குடும்ப அட்டை (Smart Card)",
                "ஆதார் அட்டை",
                "வங்கி கணக்கு புத்தகத்தின் முதல் பக்க நகல்"
            ]
        },
        "applicationSteps": {
            "en": [
                "Visit Tamil Nadu Differently Abled Welfare Portal: https://www.scda.tn.gov.in/",
                "Apply online via e-Sevai centers or submit physical application to District Differently Abled Welfare Officer (DDAWO).",
                "Attach medical board certificate, smart card copy, and bank passbook details.",
                "Upon verification by Village Administrative Officer (VAO) and DDAWO, monthly pension is sanctioned."
            ],
            "ta": [
                "தமிழ்நாடு மாற்றுத்திறனாளிகள் நல இணையதளத்தைப் பார்க்கவும்: https://www.scda.tn.gov.in/",
                "இ-சேவை மையங்கள் மூலமாகவோ அல்லது மாவட்ட மாற்றுத்திறனாளிகள் நல அலுவலகத்தில் நேரடியாகவோ விண்ணப்பிக்கலாம்.",
                "மருத்துவ சான்றிதழ் மற்றும் ரேஷன் கார்டு நகல்களை இணைக்கவும்.",
                "அதிகாரிகளின் கள ஆய்வுக்கு பின் மாதாந்திர தொகை கணக்கில் வரவு வைக்கப்படும்."
            ]
        },
        "applicableDisabilities": {
            "en": [
                "Hearing Impairment & Speech Impairment",
                "Locomotor Disability / Muscular Dystrophy",
                "Intellectual Disability",
                "Spinal Injury"
            ],
            "ta": [
                "செவித்திறன் & பேச்சு குறைபாடு",
                "உடலியக்க குறைபாடு / தசைநார் சிதைவு நோய்",
                "மனவளர்ச்சி குறைபாடு",
                "தண்டுவட பாதிப்பு"
            ]
        },
        "officialInfoUrl": "https://www.scda.tn.gov.in/",
        "officialApplyUrl": "https://www.scda.tn.gov.in/",
        "sourceName": "Commissionerate for Welfare of the Differently Abled, Govt of Tamil Nadu",
        "lastVerifiedAt": "2026-07-21",
        "status": "Active / Application Open",
        "importantDates": {
            "en": "Applications can be submitted anytime throughout the year at District Welfare Offices or e-Sevai centers.",
            "ta": "மாவட்ட அலுவலகங்கள் அல்லது இ-சேவை மையங்கள் மூலம் ஆண்டு முழுவதும் விண்ணப்பிக்கலாம்."
        }
    },
    {
        "id": "tn_free_assistive_devices",
        "name": {
            "en": "Tamil Nadu Free Supply of Hearing Aids & Assistive Devices",
            "ta": "தமிழ்நாடு அரசு இலவச காது கேட்கும் கருவி மற்றும் உதவி உபகரணங்கள் வழங்கும் திட்டம்"
        },
        "shortDescription": {
            "en": "Free distribution of modern Behind-The-Ear (BTE) hearing aids, solar-powered appliances, wheelchairs, and tricycles by the TN State Government.",
            "ta": "காது கேளாதோர் மற்றும் வாய் பேசாதோருக்கு இலவச டிஜிட்டல் காது கேட்கும் கருவிகள் மற்றும் உதவி உபகரணங்கள் வழங்கும் திட்டம்."
        },
        "category": "assistive_devices",
        "governmentLevel": "state_tn",
        "department": {
            "en": "Department for Welfare of Differently Abled Persons, Government of Tamil Nadu",
            "ta": "மாற்றுத்திறனாளிகள் நலத்துறை, தமிழ்நாடு அரசு"
        },
        "eligibility": {
            "en": [
                "Resident of Tamil Nadu with 40%+ hearing/speech or physical disability.",
                "Audiometric test certificate confirming degree of hearing loss.",
                "Family income within prescribed State government limits."
            ],
            "ta": [
                "40% க்கும் அதிகமான செவித்திறன் / பேச்சு / உடலியக்க குறைபாடுள்ள தமிழ்நாடு வாழ் மக்கள்.",
                "செவித்திறன் குறைபாட்டை உறுதிப்படுத்தும் ஆடியோகிராம் சான்றிதழ்.",
                "அரசு நிர்ணயித்த குடும்ப வருமான வரம்பிற்குள் இருக்க வேண்டும்."
            ]
        },
        "benefits": {
            "en": [
                "100% Free modern digital Behind-The-Ear (BTE) hearing aid.",
                "Free retrofitted petrol scooters for persons with locomotor disability.",
                "Solar rechargeable lamps, wheelchairs, and customized walking aids."
            ],
            "ta": [
                "100% இலவச நவீன டிஜிட்டல் காது கேட்கும் கருவி (BTE Hearing Aid).",
                "உடலியக்க குறைபாடுள்ளவர்களுக்கு இலவச இணைப்பு சக்கரம் பொருத்தப்பட்ட ஸ்கூட்டர்.",
                "சூரிய மின்சக்தி விளக்குகள் மற்றும் சக்கர நாற்காலிகள்."
            ]
        },
        "documents": {
            "en": [
                "UDID Card / Disability Certificate",
                "Audiogram Certificate (for hearing aids)",
                "Tamil Nadu Smart Ration Card",
                "Aadhaar Card"
            ],
            "ta": [
                "UDID அட்டை / மாற்றுத்திறன் சான்றிதழ்",
                "ஆடியோகிராம் சான்றிதழ் (காது கேட்கும் கருவிக்கு)",
                "தமிழ்நாடு ஸ்மார்ட் ரேஷன் கார்டு",
                "ஆதார் அட்டை"
            ]
        },
        "applicationSteps": {
            "en": [
                "Visit Tamil Nadu Differently Abled Welfare site: https://www.scda.tn.gov.in/",
                "Submit application to District Differently Abled Welfare Officer (DDAWO) at District Collectorate.",
                "Attend free medical assessment camp conducted by ENT specialists.",
                "Collect fitted hearing aid directly from DDAWO office."
            ],
            "ta": [
                "இணையதளத்தைப் பார்க்கவும்: https://www.scda.tn.gov.in/",
                "மாவட்ட ஆட்சியர் அலுவலகத்தில் உள்ள மாவட்ட மாற்றுத்திறனாளிகள் நல அலுவலரிடம் விண்ணப்பிக்கவும்.",
                "இஎன்டி (ENT) மருத்துவர் நடத்தும் இலவச பரிசோதனை முகாமில் பங்கேற்கவும்.",
                "பொருத்தமான காது கேட்கும் கருவியை அலுவலகத்தில் இலவசமாகப் பெறவும்."
            ]
        },
        "applicableDisabilities": {
            "en": [
                "Hearing Impairment",
                "Speech and Language Disability",
                "Locomotor Disability"
            ],
            "ta": [
                "செவித்திறன் குறைபாடு",
                "பேச்சு மற்றும் மொழி குறைபாடு",
                "உடலியக்க குறைபாடு"
            ]
        },
        "officialInfoUrl": "https://www.scda.tn.gov.in/",
        "officialApplyUrl": "https://www.scda.tn.gov.in/",
        "sourceName": "Commissionerate for Welfare of the Differently Abled, TN",
        "lastVerifiedAt": "2026-07-21",
        "status": "Active / Camps Check Recommended",
        "importantDates": {
            "en": "Distribution camps conducted regularly at district level.",
            "ta": "மாவட்ட அளவில் தொடர்ந்து இலவச முகாம்கள் நடத்தப்படுகின்றன."
        }
    },
    {
        "id": "tn_marriage_assistance",
        "name": {
            "en": "Tamil Nadu Marriage Assistance Scheme for Differently Abled Persons",
            "ta": "தமிழ்நாடு மாற்றுத்திறனாளிகளுக்கான திருமண உதவித்திட்டம்"
        },
        "shortDescription": {
            "en": "Financial grant and gold for Thirumangalyam provided by Tamil Nadu Government to encourage marriage and social integration of differently abled individuals.",
            "ta": "மாற்றுத்திறனாளிகளின் சமூக நல்வாழ்வை ஊக்குவிக்க தமிழ்நாட்டு அரசு வழங்கும் திருமண உதவித்தொகை மற்றும் திருமாங்கல்ய தங்கம்."
        },
        "category": "social_welfare",
        "governmentLevel": "state_tn",
        "department": {
            "en": "Commissionerate for Welfare of the Differently Abled, Tamil Nadu",
            "ta": "மாற்றுத்திறனாளிகள் நல ஆணையரகம், தமிழ்நாடு அரசு"
        },
        "eligibility": {
            "en": [
                "Bride or Groom must be a person with benchmark disability (40%+ disability).",
                "Minimum age: Bride 18 years, Groom 21 years at the time of marriage.",
                "Resident of Tamil Nadu.",
                "Application must be submitted within 1 year of marriage."
            ],
            "ta": [
                "மணமகன் அல்லது மணமகள் 40% அல்லது அதற்கு மேற்பட்ட மாற்றுத்திறனாளியாக இருக்க வேண்டும்.",
                "திருமணத்தின் போது குறைந்தபட்ச வயது: மணமகள் 18, மணமகன் 21.",
                "தமிழ்நாட்டில் வசிப்பவராக இருக்க வேண்டும்.",
                "திருமணம் முடிந்த 1 ஆண்டுக்குள் விண்ணப்பிக்க வேண்டும்."
            ]
        },
        "benefits": {
            "en": [
                "Financial assistance up to ₹50,000/- for graduates / diploma holders (₹25,000/- for non-graduates).",
                "8 Grams (1 Sovereign) 22ct Gold Coin for Thirumangalyam."
            ],
            "ta": [
                "பட்டதாரிகளுக்கு ₹50,000/- நிதியுதவி (பட்டதாரி அல்லாதோருக்கு ₹25,000/-).",
                "திருமாங்கல்யம் செய்ய 8 கிராம் (1 சவரன்) 22 கேரட் தங்க நாணயம்."
            ]
        },
        "documents": {
            "en": [
                "Disability Certificate / UDID Card",
                "Marriage Registration Certificate",
                "Educational Qualification Certificate (Degree / Diploma / Marksheet)",
                "Smart Ration Card & Aadhaar Card"
            ],
            "ta": [
                "மாற்றுத்திறன் சான்றிதழ் / UDID அட்டை",
                "திருமணப் பதிவுச் சான்றிதழ்",
                "கல்வித் தகுதிச் சான்றிதழ் (பட்டப்படிப்பு / டிப்ளமோ சான்றிதழ்)",
                "ஸ்மார்ட் ரேஷன் கார்டு மற்றும் ஆதார் அட்டை"
            ]
        },
        "applicationSteps": {
            "en": [
                "Visit TN Welfare portal: https://www.scda.tn.gov.in/",
                "Submit application along with Marriage Certificate at District Differently Abled Welfare Office.",
                "Upon verification, grant amount is credited to bank account and Gold Sovereign is issued."
            ],
            "ta": [
                "இணையதளத்தைப் பார்க்கவும்: https://www.scda.tn.gov.in/",
                "மாவட்ட மாற்றுத்திறனாளிகள் நல அலுவலகத்தில் திருமண சான்றிதழுடன் விண்ணப்பிக்கவும்.",
                "சரிபார்ப்பிற்கு பின் உதவித்தொகை மற்றும் தங்க நாணயம் வழங்கப்படும்."
            ]
        },
        "applicableDisabilities": {
            "en": [
                "Hearing Impairment & Speech Impairment",
                "Locomotor Disability",
                "Visual Impairment",
                "All Benchmark Disabilities"
            ],
            "ta": [
                "செவித்திறன் & பேச்சு குறைபாடு",
                "உடலியக்க குறைபாடு",
                "பார்வை குறைபாடு",
                "அனைத்து மாற்றுத்திறன்கள்"
            ]
        },
        "officialInfoUrl": "https://www.scda.tn.gov.in/",
        "officialApplyUrl": "https://www.scda.tn.gov.in/",
        "sourceName": "Commissionerate for Welfare of the Differently Abled, TN",
        "lastVerifiedAt": "2026-07-21",
        "status": "Active / Application Open",
        "importantDates": {
            "en": "Apply within 12 months from the date of marriage registration.",
            "ta": "திருமணப் பதிவு செய்த 12 மாதங்களுக்குள் விண்ணப்பிக்க வேண்டும்."
        }
    },
    {
        "id": "railway_bus_concession",
        "name": {
            "en": "Concession in Rail & State Bus Fare for Persons with Disabilities",
            "ta": "மாற்றுத்திறனாளிகளுக்கான ரயில் மற்றும் பேருந்து பயணக் கட்டண சலுகை"
        },
        "shortDescription": {
            "en": "Up to 75% concession in Indian Railways train fares and free/discounted travel passes in State Transport Corporation buses across India.",
            "ta": "இந்திய ரயில்களில் 75% வரை பயணக் கட்டணக் கழிவு மற்றும் அரசுப் பேருந்துகளில் இலவச/சலுகைக் கட்டணப் பயணச் சீட்டு."
        },
        "category": "travel",
        "governmentLevel": "central",
        "department": {
            "en": "Ministry of Railways & State Transport Undertakings (TNSTC / MTC)",
            "ta": "ரயில்வே அமைச்சகம் & தமிழ்நாடு அரசு போக்குவரத்து கழகம்"
        },
        "eligibility": {
            "en": [
                "Deaf and Hard of Hearing persons (Totally deaf & speech impaired or severe hearing loss).",
                "Orthopaedically Handicapped / Paraplegic persons who cannot travel without an escort.",
                "Visually Impaired persons with total absence of sight.",
                "Must hold valid Railway Photo Concession Certificate or UDID Card."
            ],
            "ta": [
                "முழுமையாக செவித்திறன் மற்றும் பேச்சு குறைபாடு உள்ளவர்கள்.",
                "துணையின்றி பயணம் செய்ய முடியாத உடலியக்கக் குறைபாடு உள்ளவர்கள்.",
                "பார்வையற்ற நபர்கள்.",
                "செல்லுபடியாகும் ரயில்வே சலுகைச் சான்றிதழ் அல்லது UDID அட்டை இருக்க வேண்டும்."
            ]
        },
        "benefits": {
            "en": [
                "75% fare discount in Sleeper, 3AC, 2AC, and Chair Car classes in Indian Railways for person with disability and one escort.",
                "100% Free local MTC/TNSTC bus passes for town buses in Tamil Nadu.",
                "Dedicated Divyangjan ticket booking counters and online IRCTC Divyangjan portal booking."
            ],
            "ta": [
                "ரயில் பயணங்களில் ஸ்லீப்பர், 3AC, 2AC வகுப்புகளில் 75% கட்டணக் கழிவு (துணை வருபவருக்கும் தள்ளுபடி உண்டு).",
                "தமிழ்நாடு அரசுப் பேருந்துகளில் (MTC/TNSTC) கட்டணமில்லா இலவச பேருந்துப் பயணம்.",
                "IRCTC இணையதளத்தில் 'Divyangjan' பிரிவில் எளிதாக ஆன்லைனில் டிக்கெட் முன்பதிவு வசதி."
            ]
        },
        "documents": {
            "en": [
                "Railway Concession Certificate issued by DMO / Government Doctor",
                "UDID Card / Disability Certificate",
                "Aadhaar Card",
                "Passport size photograph"
            ],
            "ta": [
                "அரசு மருத்துவர் வழங்கிய ரயில்வே சலுகைச் சான்றிதழ்",
                "UDID அட்டை / மாற்றுத்திறன் சான்றிதழ்",
                "ஆதார் அட்டை",
                "பாஸ்போர்ட் அளவு புகைப்படம்"
            ]
        },
        "applicationSteps": {
            "en": [
                "Obtain Railway Concession Certificate signed by Government Specialist Doctor.",
                "Visit IRCTC Divyangjan portal or Railway DRM office to issue Unique Railway Concession ID.",
                "Book train tickets online at https://www.irctc.co.in/ using your Divyangjan ID.",
                "For Bus travel passes, visit nearest TNSTC depot with UDID Card."
            ],
            "ta": [
                "அரசு மருத்துவரிடம் ரயில்வே சலுகைச் சான்றிதழ் பெறவும்.",
                "ரயில்வே மேலாளர் (DRM) அலுவலகத்தில் சலுகை அட்டையைப் பதிவு செய்யவும்.",
                "IRCTC தளம் (https://www.irctc.co.in/) மூலம் Divyangjan பிரிவில் டிக்கெட் முன்பதிவு செய்யவும்.",
                "இலவச பேருந்துப் பாஸுக்கு அருகிலுள்ள அரசுப் பேருந்து பணிமனையை அணுகவும்."
            ]
        },
        "applicableDisabilities": {
            "en": [
                "Hearing Impairment & Speech Impairment",
                "Locomotor Disability",
                "Visual Impairment",
                "Intellectual Disability"
            ],
            "ta": [
                "செவித்திறன் & பேச்சு குறைபாடு",
                "உடலியக்க குறைபாடு",
                "பார்வை குறைபாடு",
                "மனவளர்ச்சி குறைபாடு"
            ]
        },
        "officialInfoUrl": "https://www.irctc.co.in/",
        "officialApplyUrl": "https://www.swavlambancard.gov.in/",
        "sourceName": "Ministry of Railways & State Transport Undertakings",
        "lastVerifiedAt": "2026-07-21",
        "status": "Active / Application Open",
        "importantDates": {
            "en": "Concession cards can be issued and used continuously throughout the year.",
            "ta": "ஆண்டு முழுவதும் சலுகை அட்டைகளைப் பெற்றுப் பயன்படுத்தலாம்."
        }
    }
]

class SchemeService:
    @staticmethod
    async def seed_verified_schemes():
        """Ensure initial verified schemes are populated in MongoDB."""
        try:
            count = await db.schemes.count_documents({})
            if count == 0:
                await db.schemes.insert_many(VERIFIED_SCHEMES)
                app_logger.info(f"[SchemeService] Seeded {len(VERIFIED_SCHEMES)} verified government schemes into MongoDB.")
            else:
                app_logger.info(f"[SchemeService] Schemes collection already contains {count} records.")
        except Exception as exc:
            app_logger.error(f"[SchemeService] Failed to seed schemes collection: {exc}")

    @staticmethod
    async def get_schemes(
        category: Optional[str] = None,
        government_level: Optional[str] = None,
        disability_type: Optional[str] = None,
        search: Optional[str] = None,
        language: str = "en"
    ) -> List[Dict[str, Any]]:
        """Retrieve schemes with optional category, level, disability, and search filtering."""
        query: Dict[str, Any] = {}

        if category and category != "all":
            query["category"] = category

        if government_level and government_level != "all":
            query["governmentLevel"] = government_level

        if disability_type and disability_type != "all":
            # Search in applicableDisabilities lists
            query["$or"] = [
                {"applicableDisabilities.en": {"$regex": disability_type, "$options": "i"}},
                {"applicableDisabilities.ta": {"$regex": disability_type, "$options": "i"}}
            ]

        cursor = db.schemes.find(query, {"_id": 0})
        schemes = await cursor.to_list(length=100)

        # In-memory text search filtering if search term provided
        if search and search.strip():
            s = search.strip().lower()
            filtered = []
            for sc in schemes:
                name_en = sc.get("name", {}).get("en", "").lower()
                name_ta = sc.get("name", {}).get("ta", "").lower()
                desc_en = sc.get("shortDescription", {}).get("en", "").lower()
                desc_ta = sc.get("shortDescription", {}).get("ta", "").lower()
                dept_en = sc.get("department", {}).get("en", "").lower()

                if (s in name_en or s in name_ta or s in desc_en or s in desc_ta or s in dept_en):
                    filtered.append(sc)
            return filtered

        return schemes

    @staticmethod
    async def get_scheme_by_id(scheme_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve single scheme by ID."""
        scheme = await db.schemes.find_one({"id": scheme_id}, {"_id": 0})
        return scheme
