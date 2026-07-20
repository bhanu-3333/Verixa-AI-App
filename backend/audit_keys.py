en = open('C:/Users/Udaya bhanu/Verixa-AI-App/verixa-app/src/locales/en.ts', encoding='utf-8').read()
ta = open('C:/Users/Udaya bhanu/Verixa-AI-App/verixa-app/src/locales/ta.ts', encoding='utf-8').read()
keys = [
    'emergency_title','emergency_back','emergency_location_title',
    'emergency_location_lat','emergency_location_lon','emergency_location_ready',
    'emergency_location_fallback','emergency_location_unavailable',
    'emergency_type_title','emergency_type_medical','emergency_type_police',
    'emergency_type_fire','emergency_type_general','emergency_sos_hint',
    'emergency_sending','emergency_success_text','emergency_failed_popup_title',
    'emergency_no_location','emergency_no_location_title',
    'emergency_history_title','emergency_history_empty',
    'emergency_delete','emergency_confirm_delete','emergency_error','ok',
]
print('KEY AUDIT:')
all_ok = True
for k in keys:
    needle = f"  {k}:"
    in_en = needle in en
    in_ta = needle in ta
    status = 'OK' if (in_en and in_ta) else f'MISSING  en={in_en}  ta={in_ta}'
    if 'MISSING' in status:
        all_ok = False
    print(f'  {k:<42} {status}')
print()
print('All keys present:', all_ok)
