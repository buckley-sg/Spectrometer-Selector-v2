import pandas as pd
import re
import json

df = pd.read_excel('/mnt/user-data/uploads/OtO-Resolution_Table-202501.xlsx',
                   sheet_name='工作表1', header=None)
ndf = pd.read_excel('/mnt/user-data/uploads/20250513__Naming_Rule.xlsx',
                    sheet_name='WL Naming vs Grating', header=None)

EVOLVE_MAP = {
    'SE': 'SmartEngine', 'EE': 'EagleEye', 'HB': 'HummingBird',
    'SW': 'SideWinder', 'SB': 'SilverBullet', 'RB': 'RedBullet',
    'PD': 'Phenom', 'MG': 'Magna', 'DF': 'Dragonfly',
    'PH': 'PocketHawk', 'DB': 'Delta', 'GB': 'GoldenBullet',
    'MR': 'Merak',
}

def parse_resolution(val):
    if pd.isna(val): return None
    s = str(val).strip().lstrip('~').strip()
    if s in ('-', '', 'nan'): return None
    m = re.match(r'([\d.]+)', s)
    return float(m.group(1)) if m else None

def parse_range(range_str):
    if pd.isna(range_str): return None, None
    s = str(range_str).strip().replace('\n', '').replace('\xa0', '').replace(' ', '')
    m = re.findall(r'(\d+)\s*[-–]\s*(\d+)', s)
    if m: return int(m[0][0]), int(m[0][1])
    return None, None

# ============================================================
# SE/EE: col1=grooves, col2=blaze, col3=bandwidth, col4=range, cols5-10=slits 10,25,50,100,200,300
# ============================================================
def parse_se_ee():
    records = []
    current = None
    slit_sizes = [10, 25, 50, 100, 200, 300]
    slit_cols = [5, 6, 7, 8, 9, 10]
    for i in range(10, 50):
        row = df.iloc[i]
        col1 = row[1]
        if pd.notna(col1) and re.match(r'^\d+', str(col1).strip()):
            if current: records.append(current)
            grooves = int(float(str(col1).strip()))
            blazes = []
            if pd.notna(row[2]):
                try: blazes.append(int(float(str(row[2]).strip())))
                except: pass
            bw = None
            if pd.notna(row[3]):
                m = re.match(r'^(\d+)', str(row[3]).strip())
                if m: bw = int(m.group(1))
            sel = None
            if pd.notna(row[4]):
                rmin, rmax = parse_range(row[4])
                if rmin and rmax: sel = [rmin, rmax]
            slit_res = {}
            for sz, ci in zip(slit_sizes, slit_cols):
                r = parse_resolution(row[ci])
                if r is not None: slit_res[sz] = r
            current = {'platforms': ['SE', 'EE'], 'grating_grooves': grooves,
                       'blaze_wavelengths': blazes, 'bandwidth_nm': bw,
                       'selectable_range': sel, 'slit_resolutions': slit_res}
        else:
            if current and pd.notna(row[2]):
                try: current['blaze_wavelengths'].append(int(float(str(row[2]).strip())))
                except: pass
    if current: records.append(current)
    return records

# ============================================================
# HB: same layout as SE/EE but range split across rows ("180-" then "540")
# ============================================================
def parse_hb():
    records = []
    current = None
    slit_sizes = [10, 25, 50, 100, 200, 300]
    slit_cols = [5, 6, 7, 8, 9, 10]
    for i in range(57, 78):
        row = df.iloc[i]
        col1 = row[1]
        if pd.notna(col1) and re.match(r'^\d+', str(col1).strip()):
            if current: records.append(current)
            grooves = int(float(str(col1).strip()))
            blazes = []
            if pd.notna(row[2]):
                try: blazes.append(int(float(str(row[2]).strip())))
                except: pass
            bw = None
            if pd.notna(row[3]):
                bw_str = str(row[3]).strip().replace('\\n', '')
                m = re.match(r'^(\d+)', bw_str)
                if m: bw = int(m.group(1))
            sel = None
            if pd.notna(row[4]):
                range_str = str(row[4]).strip()
                m = re.match(r'^(\d+)\s*-\s*$', range_str)
                if m:
                    start = int(m.group(1))
                    nxt = df.iloc[i+1]
                    if pd.notna(nxt[4]):
                        try:
                            end = int(float(str(nxt[4]).strip()))
                            sel = [start, end]
                        except: pass
                else:
                    rmin, rmax = parse_range(range_str)
                    if rmin and rmax: sel = [rmin, rmax]
            slit_res = {}
            for sz, ci in zip(slit_sizes, slit_cols):
                r = parse_resolution(row[ci])
                if r is not None: slit_res[sz] = r
            current = {'platforms': ['HB'], 'grating_grooves': grooves,
                       'blaze_wavelengths': blazes, 'bandwidth_nm': bw,
                       'selectable_range': sel, 'slit_resolutions': slit_res}
        else:
            if current and pd.notna(row[2]):
                try: current['blaze_wavelengths'].append(int(float(str(row[2]).strip())))
                except: pass
    if current: records.append(current)
    return records

# ============================================================
# SW: col1=model, col2=grooves, col3=blaze, col4=bandwidth, col5=range, 
#     cols 6-11 = slits 10,25,50,100,150,200
# ============================================================
def parse_sw():
    records = []
    slit_sizes = [10, 25, 50, 100, 150, 200]
    slit_cols = [6, 7, 8, 9, 10, 11]
    current_model = None
    current_bw = None
    current_sel = None

    for i in range(84, 101):
        row = df.iloc[i]
        col1_str = str(row[1]).strip() if pd.notna(row[1]) else ''
        if col1_str.startswith('SW'):
            current_model = col1_str
            if pd.notna(row[4]):
                m = re.match(r'^(\d+)', str(row[4]).strip().replace('\xa0', ''))
                if m: current_bw = int(m.group(1))
            if pd.notna(row[5]):
                rmin, rmax = parse_range(row[5])
                if rmin and rmax: current_sel = [rmin, rmax]

        col2 = row[2]
        if not (pd.notna(col2) and re.match(r'^[\d.]+$', str(col2).strip())):
            continue

        grooves = float(str(col2).strip())
        blaze = None
        if pd.notna(row[3]):
            try: blaze = int(float(str(row[3]).strip()))
            except: pass

        slit_res = {}
        for sz, ci in zip(slit_sizes, slit_cols):
            r = parse_resolution(row[ci])
            if r is not None: slit_res[sz] = r

        records.append({
            'platforms': ['SW'], 'model': current_model,
            'grating_grooves': grooves,
            'blaze_wavelengths': [blaze] if blaze else [],
            'bandwidth_nm': current_bw,
            'selectable_range': current_sel,
            'slit_resolutions': slit_res,
        })
    return records

# ============================================================
# SB: col1=model, col2=grooves, col3=blaze, col4=bandwidth, col5=range,
#     cols 6-10 = slits 10,25,50,100,200
# ============================================================
def parse_sb():
    records = []
    slit_sizes = [10, 25, 50, 100, 200]
    slit_cols = [6, 7, 8, 9, 10]
    current_model = None

    for i in range(154, 165):
        row = df.iloc[i]
        col1_str = str(row[1]).strip() if pd.notna(row[1]) else ''
        if col1_str.startswith('SB'):
            current_model = col1_str

        col2 = row[2]
        if not (pd.notna(col2) and re.match(r'^\d+', str(col2).strip())):
            continue

        grooves = int(float(str(col2).strip()))
        blazes = []
        if pd.notna(row[3]):
            try: blazes.append(int(float(str(row[3]).strip())))
            except: pass
        bw = None
        if pd.notna(row[4]):
            m = re.match(r'^(\d+)', str(row[4]).strip())
            if m: bw = int(m.group(1))
        sel = None
        if pd.notna(row[5]):
            rmin, rmax = parse_range(row[5])
            if rmin and rmax: sel = [rmin, rmax]

        slit_res = {}
        for sz, ci in zip(slit_sizes, slit_cols):
            r = parse_resolution(row[ci])
            if r is not None: slit_res[sz] = r

        records.append({
            'platforms': ['SB'], 'model': current_model or 'SB4134',
            'grating_grooves': grooves, 'blaze_wavelengths': blazes,
            'bandwidth_nm': bw, 'selectable_range': sel,
            'slit_resolutions': slit_res,
        })
    return records

# ============================================================
# RB: col1=model, col2=grooves, col3=blaze, col4=bandwidth, col5=range,
#     cols 5-8 = slits 25,50,100,200
# Actually from the data: col5=25um, col6=50um, col7=100um, col8=200um
# ============================================================
def parse_rb():
    records = []
    slit_sizes = [25, 50, 100, 200]
    slit_cols = [5, 6, 7, 8]
    current_model = None

    for i in range(174, 177):
        row = df.iloc[i]
        col1_str = str(row[1]).strip() if pd.notna(row[1]) else ''
        if col1_str.startswith('RB'):
            current_model = col1_str

        col2 = row[2]
        if not (pd.notna(col2) and re.match(r'^[\d.]+', str(col2).strip())):
            continue

        grooves = float(str(col2).strip())
        blazes = []
        if pd.notna(row[3]):
            try: blazes.append(int(float(str(row[3]).strip())))
            except: pass
        bw = None
        if pd.notna(row[4]):
            m = re.match(r'^(\d+)', str(row[4]).strip())
            if m: bw = int(m.group(1))
        sel = None
        # RB range is in col5 for row 176, but for 174-175 it might be elsewhere
        if pd.notna(row[5]):
            rmin, rmax = parse_range(row[5])
            if rmin and rmax:
                sel = [rmin, rmax]
                # But slits are also in these cols... need to check
        
        slit_res = {}
        for sz, ci in zip(slit_sizes, slit_cols):
            r = parse_resolution(row[ci])
            if r is not None: slit_res[sz] = r

        records.append({
            'platforms': ['RB'], 'model': current_model,
            'grating_grooves': grooves, 'blaze_wavelengths': blazes,
            'bandwidth_nm': bw, 'selectable_range': sel,
            'slit_resolutions': slit_res,
        })
    return records

# ============================================================
# Hardcoded sections with small, well-understood data
# ============================================================
def parse_ph2014():
    records = []
    slit_sizes = [10, 25, 50, 100, 200, 300]
    slit_cols = [5, 6, 7, 8, 9, 10]
    for i in range(108, 112):
        row = df.iloc[i]
        col1 = row[1]
        if not (pd.notna(col1) and re.match(r'^\d+', str(col1).strip())): continue
        grooves = int(float(str(col1).strip()))
        blazes = []
        if pd.notna(row[2]):
            try: blazes.append(int(float(str(row[2]).strip())))
            except: pass
        bw = None
        if pd.notna(row[3]):
            m = re.match(r'^(\d+)', str(row[3]).strip())
            if m: bw = int(m.group(1))
        sel = None
        if pd.notna(row[4]):
            rmin, rmax = parse_range(row[4])
            if rmin and rmax: sel = [rmin, rmax]
        slit_res = {}
        for sz, ci in zip(slit_sizes, slit_cols):
            r = parse_resolution(row[ci])
            if r is not None: slit_res[sz] = r
        records.append({'platforms': ['PH'], 'model': 'PH2014', 'grating_grooves': grooves,
                        'blaze_wavelengths': blazes, 'bandwidth_nm': bw,
                        'selectable_range': sel, 'slit_resolutions': slit_res})
    return records

def parse_ph2034():
    records = []
    slit_sizes = [10, 25, 50, 100, 200, 300]
    slit_cols = [5, 6, 7, 8, 9, 10]
    for i in range(119, 124):
        row = df.iloc[i]
        col1 = row[1]
        if not (pd.notna(col1) and re.match(r'^\d+', str(col1).strip())): continue
        grooves = int(float(str(col1).strip()))
        blazes = []
        if pd.notna(row[2]):
            try: blazes.append(int(float(str(row[2]).strip())))
            except: pass
        bw = None
        if pd.notna(row[3]):
            m = re.match(r'^(\d+)', str(row[3]).strip())
            if m: bw = int(m.group(1))
        sel = None
        if pd.notna(row[4]):
            rmin, rmax = parse_range(row[4])
            if rmin and rmax: sel = [rmin, rmax]
        slit_res = {}
        for sz, ci in zip(slit_sizes, slit_cols):
            r = parse_resolution(row[ci])
            if r is not None: slit_res[sz] = r
        records.append({'platforms': ['PH'], 'model': 'PH2034', 'grating_grooves': grooves,
                        'blaze_wavelengths': blazes, 'bandwidth_nm': bw,
                        'selectable_range': sel, 'slit_resolutions': slit_res})
    return records

def parse_phnir():
    return [
        {'platforms': ['PH'], 'model': 'PH2524', 'grating_grooves': 150,
         'blaze_wavelengths': [1250], 'bandwidth_nm': 800,
         'selectable_range': [900, 1700], 'slit_resolutions': {50: 10.0, 100: 18.0, 200: 30.0}},
        {'platforms': ['PH'], 'model': 'PH2534', 'grating_grooves': 300,
         'blaze_wavelengths': [1200], 'bandwidth_nm': 800,
         'selectable_range': [900, 1700], 'slit_resolutions': {50: 5.0, 100: 9.0, 200: 15.0}},
    ]

def parse_mr():
    return [{'platforms': ['MR'], 'model': 'MR1080', 'grating_grooves': 1500,
             'blaze_wavelengths': [930], 'bandwidth_nm': 140,
             'selectable_range': [830, 970], 'slit_resolutions': {5: 0.09, 25: 0.2}}]

def parse_pd():
    # From rows 190-196, col layout: col1=model, col2=grooves, col3=blaze, col4=bandwidth, col5=range, cols5-7=slits 5,10,25
    records = []
    slit_sizes = [5, 10, 25]
    slit_cols = [5, 6, 7]
    current_model = None
    for i in range(190, 197):
        row = df.iloc[i]
        col1_str = str(row[1]).strip() if pd.notna(row[1]) else ''
        if col1_str.startswith('PD'):
            current_model = col1_str
        col2 = row[2]
        if not (pd.notna(col2) and re.match(r'^\d+', str(col2).strip())): continue
        grooves = int(float(str(col2).strip()))
        blazes = []
        if pd.notna(row[3]):
            try: blazes.append(int(float(str(row[3]).strip())))
            except: pass
        bw = None
        if pd.notna(row[4]):
            m = re.match(r'^(\d+)', str(row[4]).strip())
            if m: bw = int(m.group(1))
        sel = None
        if pd.notna(row[5]):
            rmin, rmax = parse_range(row[5])
            if rmin and rmax: sel = [rmin, rmax]
        slit_res = {}
        for sz, ci in zip(slit_sizes, slit_cols):
            r = parse_resolution(row[ci])
            if r is not None: slit_res[sz] = r
        records.append({'platforms': ['PD'], 'model': current_model,
                        'grating_grooves': grooves, 'blaze_wavelengths': blazes,
                        'bandwidth_nm': bw, 'selectable_range': sel, 'slit_resolutions': slit_res})
    return records

def parse_df():
    return [{'platforms': ['DF'], 'model': 'DF1514', 'grating_grooves': 300,
             'blaze_wavelengths': [1200], 'bandwidth_nm': 800,
             'selectable_range': [900, 1700], 'slit_resolutions': {25: 10.5}}]

# ============================================================
# ASSEMBLE
# ============================================================
all_records = []
all_records.extend(parse_se_ee())
all_records.extend(parse_hb())
all_records.extend(parse_sw())
all_records.extend(parse_ph2014())
all_records.extend(parse_ph2034())
all_records.extend(parse_phnir())
all_records.extend(parse_sb())
all_records.extend(parse_rb())
all_records.extend(parse_mr())
all_records.extend(parse_pd())
all_records.extend(parse_df())

# Enrich
for rec in all_records:
    rec['evolve_names'] = [EVOLVE_MAP[p] for p in rec['platforms'] if p in EVOLVE_MAP]
    rec['is_evolve'] = bool(rec['evolve_names'])
    rec['slit_resolutions'] = {int(k): v for k, v in rec['slit_resolutions'].items()}

# Parse naming rules
naming_records = []
for i in range(3, len(ndf)):
    row = ndf.iloc[i]
    code = row[1]
    if pd.isna(code) or not isinstance(code, str): continue
    code = code.strip()
    if not code or 'text' in code.lower(): continue
    wl_str = str(row[2]).strip() if pd.notna(row[2]) else ''
    wl_match = re.findall(r'(\d+)\s*[-–]\s*(\d+)', wl_str)
    wl_min, wl_max = (int(wl_match[0][0]), int(wl_match[0][1])) if wl_match else (None, None)
    grating_str = str(row[4]).strip() if pd.notna(row[4]) else ''
    grating_match = re.match(r'([\d.]+)g?\s+(\d+)', grating_str)
    grooves, blaze = (float(grating_match.group(1)), int(grating_match.group(2))) if grating_match else (None, None)
    types_str = str(row[3]).strip() if pd.notna(row[3]) else ''
    naming_records.append({
        'code': code, 'wl_min': wl_min, 'wl_max': wl_max,
        'wl_range_str': wl_str, 'platforms_raw': types_str,
        'platform_codes': re.findall(r'[A-Z]{2}', types_str),
        'grating_spec_str': grating_str, 'grooves': grooves, 'blaze': blaze,
    })

output = {'resolution_records': all_records, 'naming_records': naming_records, 'evolve_map': EVOLVE_MAP}
with open('/home/claude/spectrometer_data.json', 'w') as f:
    json.dump(output, f, indent=2)

print(f"Total resolution records: {len(all_records)}")
print(f"Total naming records: {len(naming_records)}")

# Validate: check for suspicious resolution values
print("\n=== Validation: checking for resolution > 50 nm (likely parsing errors) ===")
for rec in all_records:
    for slit, res in rec['slit_resolutions'].items():
        if res > 50:
            print(f"  WARNING: {rec['platforms']} {rec.get('model','')} {rec['grating_grooves']}g/mm "
                  f"slit={slit}um res={res}nm")

from collections import Counter
pc = Counter()
for r in all_records:
    for p in r['platforms']: pc[p] += 1
print("\nRecords per platform:")
for p, c in sorted(pc.items()):
    print(f"  {p} ({EVOLVE_MAP.get(p, 'N/A')}): {c}")
