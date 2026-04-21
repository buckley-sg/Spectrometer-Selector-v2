import json

with open('/home/claude/spectrometer_data.json') as f:
    data = json.load(f)

resolution_records = data['resolution_records']
naming_records = data['naming_records']
evolve_map = data['evolve_map']


def find_spectrometers(wl_min, wl_max, max_resolution, evolve_only=True):
    """
    Find spectrometer configurations that:
    1. Fully cover the requested wavelength range
    2. Achieve the requested resolution or better
    3. Use the largest slit possible (best throughput)
    
    Args:
        wl_min: minimum wavelength needed (nm)
        wl_max: maximum wavelength needed (nm)
        max_resolution: maximum acceptable resolution (nm) - smaller = better
        evolve_only: if True, only return Evolve-branded products
    
    Returns:
        List of matching configurations, sorted by best throughput (largest slit)
    """
    required_bandwidth = wl_max - wl_min
    matches = []
    
    for rec in resolution_records:
        # Filter: Evolve only
        if evolve_only and not rec.get('is_evolve', False):
            continue
        
        # Filter: selectable range must fully cover requested range
        sel = rec.get('selectable_range')
        if not sel:
            continue
        sel_min, sel_max = sel
        
        # The selectable range is the full range the grating+bench CAN cover.
        # The actual configured range must fit within this.
        # Check: can the grating's bandwidth accommodate the requested range
        # AND does the selectable range cover both endpoints?
        bandwidth = rec.get('bandwidth_nm')
        if bandwidth is None:
            continue
        
        # The requested range must fit within the bandwidth
        if required_bandwidth > bandwidth:
            continue
        
        # The selectable range must cover the requested endpoints
        if sel_min > wl_min or sel_max < wl_max:
            continue
        
        # Now find the largest slit that achieves the required resolution
        slit_res = rec.get('slit_resolutions', {})
        if not slit_res:
            continue
        
        # Sort slits from largest to smallest
        sorted_slits = sorted(slit_res.items(), key=lambda x: -int(x[0]))
        
        best_slit = None
        best_res = None
        for slit_str, res in sorted_slits:
            slit = int(slit_str)
            if res <= max_resolution:
                best_slit = slit
                best_res = res
                break
        
        if best_slit is None:
            # No slit meets the resolution requirement
            # But include the best (smallest slit) for info if it's close
            continue
        
        # Look up grating code from naming rules
        grating_codes = find_grating_codes(rec)
        
        matches.append({
            'platforms': rec['platforms'],
            'evolve_names': rec.get('evolve_names', []),
            'grating_grooves': rec['grating_grooves'],
            'blaze_wavelengths': rec['blaze_wavelengths'],
            'bandwidth_nm': bandwidth,
            'selectable_range': sel,
            'recommended_slit_um': best_slit,
            'resolution_at_slit_nm': best_res,
            'all_slit_resolutions': slit_res,
            'grating_codes': grating_codes,
            'model': rec.get('model'),
        })
    
    # Sort by: largest slit first (best throughput), then best resolution
    matches.sort(key=lambda x: (-x['recommended_slit_um'], x['resolution_at_slit_nm']))
    
    return matches


def find_grating_codes(rec):
    """Cross-reference a resolution record to the naming rule to find grating codes."""
    codes = []
    grooves = rec['grating_grooves']
    platforms = set(rec['platforms'])
    
    for nr in naming_records:
        if nr['grooves'] is None:
            continue
        # Match by groove density (allow small float tolerance)
        if abs(nr['grooves'] - grooves) > 1:
            continue
        # Check if any platform matches
        nr_platforms = set(nr['platform_codes'])
        if not platforms.intersection(nr_platforms):
            # Also check raw string for partial matches
            raw = nr['platforms_raw']
            found = False
            for p in platforms:
                if p in raw:
                    found = True
                    break
            if not found:
                continue
        
        # Check if blaze wavelength matches (if available)
        if nr['blaze'] is not None and rec['blaze_wavelengths']:
            if nr['blaze'] not in rec['blaze_wavelengths']:
                continue
        
        codes.append({
            'code': nr['code'],
            'wl_range': f"{nr['wl_min']}-{nr['wl_max']}nm" if nr['wl_min'] else nr['wl_range_str'],
            'grating_spec': nr['grating_spec_str'],
            'platforms_raw': nr['platforms_raw'],
        })
    
    return codes


def format_results(matches, wl_min, wl_max, max_resolution):
    """Pretty print results."""
    print(f"\n{'='*80}")
    print(f"SPECTROMETER SELECTOR RESULTS")
    print(f"Requested: {wl_min}-{wl_max} nm, resolution ≤ {max_resolution} nm")
    print(f"Required bandwidth: {wl_max - wl_min} nm")
    print(f"{'='*80}")
    
    if not matches:
        print("\n  No matching configurations found.")
        print("  Consider relaxing resolution requirement or narrowing wavelength range.")
        return
    
    print(f"\n  Found {len(matches)} matching configuration(s):\n")
    
    for i, m in enumerate(matches, 1):
        evolve_str = ' / '.join(m['evolve_names']) if m['evolve_names'] else ', '.join(m['platforms'])
        model_str = f" ({m['model']})" if m.get('model') else ''
        
        print(f"  {'─'*70}")
        print(f"  #{i}  {evolve_str}{model_str}")
        print(f"       Grating: {m['grating_grooves']} g/mm, blazed at {m['blaze_wavelengths']} nm")
        print(f"       Bandwidth: {m['bandwidth_nm']} nm | Selectable: {m['selectable_range'][0]}-{m['selectable_range'][1]} nm")
        print(f"       ★ Recommended slit: {m['recommended_slit_um']} µm → {m['resolution_at_slit_nm']} nm resolution")
        
        # Show all slit options
        slit_str = ' | '.join(f"{int(k)}µm: {v}nm" for k, v in 
                              sorted(m['all_slit_resolutions'].items(), key=lambda x: int(x[0])))
        print(f"       All slits: {slit_str}")
        
        if m['grating_codes']:
            codes_str = ', '.join(f"{c['code']} ({c['wl_range']})" for c in m['grating_codes'][:5])
            print(f"       Grating codes: {codes_str}")
        else:
            print(f"       Grating codes: (no exact match found in naming table)")
        print()


# ============================================================
# TEST CASES
# ============================================================
if __name__ == '__main__':
    # Example from Steve: 200-550 nm, resolution ≤ 0.5 nm
    print("\n\n" + "█"*80)
    print("TEST 1: Customer needs 200-550 nm, resolution ≤ 0.5 nm")
    print("█"*80)
    results = find_spectrometers(200, 550, 0.5)
    format_results(results, 200, 550, 0.5)
    
    # Test 2: Broader visible range
    print("\n\n" + "█"*80)
    print("TEST 2: Customer needs 380-780 nm (full visible), resolution ≤ 2 nm")
    print("█"*80)
    results = find_spectrometers(380, 780, 2.0)
    format_results(results, 380, 780, 2.0)
    
    # Test 3: NIR range
    print("\n\n" + "█"*80)
    print("TEST 3: Customer needs 900-1700 nm (NIR), resolution ≤ 10 nm")
    print("█"*80)
    results = find_spectrometers(900, 1700, 10.0)
    format_results(results, 900, 1700, 10.0)
    
    # Test 4: Very high resolution UV
    print("\n\n" + "█"*80)
    print("TEST 4: Customer needs 200-400 nm (UV), resolution ≤ 0.3 nm")
    print("█"*80)
    results = find_spectrometers(200, 400, 0.3)
    format_results(results, 200, 400, 0.3)
