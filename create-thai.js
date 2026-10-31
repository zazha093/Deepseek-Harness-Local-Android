#!/usr/bin/env node
// Create complete values-th/strings.xml by combining sync Thai translations with new translations

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseStringsXml(xmlContent) {
  const strings = {};
  const regex = /<string\s+name="([^"]+)">([\s\S]*?)<\/string>/g;
  let match;
  while ((match = regex.exec(xmlContent)) !== null) {
    const key = match[1];
    const value = match[2];
    strings[key] = value;
  }
  return strings;
}

function getFileFromGit(ref, filePath) {
  const outputFile = filePath.replace(/\//g, '_').replace(/\./g, '_') + '.xml';
  execSync(`/data/user/0/app.dsh.mobile/files/engine/bin/bash -c "git show ${ref}:${filePath} > ${outputFile}"`, { 
    cwd: '/data/user/0/app.dsh.mobile/files/dsh-home/DSH-Fork/agent-work',
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
    shell: '/data/user/0/app.dsh.mobile/files/engine/bin/bash'
  });
  const content = fs.readFileSync(outputFile, 'utf8');
  fs.unlinkSync(outputFile);
  return content;
}

// Get current upstream/main values/strings.xml (with our added lang_th)
const upstreamValuesXml = fs.readFileSync('/data/user/0/app.dsh.mobile/files/dsh-home/DSH-Fork/agent-work/app/src/main/res/values/strings.xml', 'utf8');
const upstreamStrings = parseStringsXml(upstreamValuesXml);
console.log(`Upstream values (with lang_th): ${Object.keys(upstreamStrings).length} keys`);

// Get sync Thai translations
const syncThaiXml = getFileFromGit('sync/upstream-1.4.40', 'app/src/main/res/values-th/strings.xml');
const syncThaiStrings = parseStringsXml(syncThaiXml);
console.log(`Sync Thai: ${Object.keys(syncThaiStrings).length} keys`);

// Fork-specific keys to exclude
const forkKeysToExclude = new Set([
  'plugin_translate_thai',
  'plugin_translating',
  'plugin_translated_to_thai',
  'plugin_translate_failed',
  'plugin_translate_all',
  'plugin_translating_progress',
  'plugin_translate_none',
  'plugin_translate_success',
  'plugin_translate_partial',
  'plugin_show_original',
  'btn_log',
  'pet_enable_without_plugin',
  'pet_enable_without_plugin_msg'
]);

// Fork-specific value fixes
const forkValueFixes = {
  'status_healthy': 'เอนจินพร้อม · http://127.0.0.1:3080'
};

// Override translations for keys that exist in both upstream and sync Thai but need fixing
const overrideTranslations = {
  'about_update_available': '%1$s พร้อมใช้ (%2$d MB)',
};

// My Thai translations for missing keys (199 keys)
const myTranslations = {
  // Settings permissions
  'settings_perm_group_engine': 'กลุ่มสิทธิ์เอนจิน',
  'settings_perm_group_caps': 'ความสามารถของระบบ',
  'setting_perm_entry_engine_sub': 'โหมดสิทธิ์เอนจิน · รูท · Shizuku',
  'setting_perm_entry_caps_sub': 'การเข้าถึง · ไฟล์ · การแจ้งเตือน · ไมโครโฟน',
  
  // Plugin build
  'plugin_build_pending_title': 'สคริปต์บิลด์ต้องได้รับการอนุมัติ',
  'plugin_build_pending_body': 'แพ็กเกจเหล่านี้ต้องการรันสคริปต์ติดตั้ง:\n%s\n\nสคริปต์ติดตั้งจะรันโค้ดแบบไม่มีข้อจำกัด',
  'plugin_build_approve': 'อนุมัติและลองใหม่',
  'plugin_build_approve_btn': 'อนุมัติการบิลด์',
  'plugin_build_approve_failed': 'ไม่สามารถเขียนการอนุมัติบิลด์ได้',
  
  // About
  'about_fork_badge': 'บิลด์ Fork',
  'lang_pt': 'Português',
  
  // Settings
  'setting_view_log': 'ดูบันทึก',
  'setting_view_log_sub': 'ท้ายบันทึกเอนจิน (engine.log / boot.log) สำหรับตรวจสอบข้อผิดพลาดและการรีสตาร์ท',
  
  // App updates
  'app_update_channel': 'ช่องอัปเดตแอป',
  'app_update_channel_desc': 'ความคืบหน้าการดาวน์โหลดสำหรับอัปเดตแอปและรันไทม์',
  'app_update_title': 'อัปเดตแอป',
  'app_update_title_proxy': '%1$s · ผ่านพร็อกซี',
  'app_update_title_direct': '%1$s · ตรง',
  'app_update_cancel': 'ยกเลิก',
  'app_update_preparing': 'กำลังเตรียม %1$s…',
  'app_update_downloading': 'กำลังดาวน์โหลด %1$s · %2$d%%',
  'app_update_bigtext': '%1$s · %2$d / %3$d MB · %4$s',
  'app_update_speed': '%1$s/วินาที',
  'app_update_done_title': 'ดาวน์โหลด %1$s เสร็จแล้ว',
  'app_update_done_text': 'แตะเพื่อติดตั้ง',
  'app_update_failed_title': 'ดาวน์โหลดล้มเหลว',
  'app_update_failed': 'ดาวน์โหลดล้มเหลว: %1$s',
  'app_update_cancelled': 'ยกเลิกการดาวน์โหลดแล้ว',
  'app_update_busy': 'มีงานอัปเดตอื่นกำลังทำงานอยู่',
  'app_update_need_space': 'พื้นที่ไม่พอ: ต้องการ %1$d MB มี %2$d MB',
  'app_update_err_version': 'เวอร์ชันแพ็กเกจไม่ตรง (พบ %1$d คาดหวัง %2$d)',
  'app_update_err_signature': 'ลายเซ็นแพ็กเกจไม่ตรงกับแอปที่ติดตั้งอยู่',
  'app_update_err_missing_file': 'ไม่พบแพ็กเกจติดตั้ง โปรดดาวน์โหลดใหม่',
  'app_update_err_no_browser': 'ไม่มีเบราว์เซอร์ให้ใช้',
  'app_update_install_failed_title': 'ติดตั้งล้มเหลว',
  'app_update_install_err_signature': 'ลายเซ็นไม่ตรง: ถอนติดตั้งเวอร์ชันปัจจุบันก่อน',
  'app_update_install_err_downgrade': 'ไม่สามารถติดตั้งเวอร์ชันเก่าได้',
  'app_update_install_err_space': 'พื้นที่จัดเก็บไม่พอ',
  'app_update_install_err_aborted': 'ยกเลิกการติดตั้งแล้ว',
  'app_update_install_err_blocked': 'การติดตั้งถูกบล็อกโดยนโยบายระบบ',
  'app_update_install_err_conflict': 'ขัดแย้งกับแพ็กเกจที่ติดตั้งอยู่',
  'app_update_install_err_incompatible': 'แพ็กเกจไม่รองรับอุปกรณ์นี้',
  'app_update_install_err_engine': 'เอนจินไม่รองรับแพ็กเกจนี้',
  'app_update_install_err_unknown': 'ข้อผิดพลาดไม่ทราบสาเหตุ',
  'app_update_dlg_title': 'อัปเดตพร้อมใช้: %1$s',
  'app_update_dlg_mobile': 'คุณไม่อยู่บน Wi-Fi แพ็กเกจนี้มีขนาด %1$d MB ต้องการดาวน์โหลดด้วยข้อมูลเคลื่อนที่ไหม?',
  'app_update_dlg_download': 'ดาวน์โหลด',
  'app_update_dlg_later': 'ภายหลัง',
  'app_update_dlg_ignore': 'ข้ามเวอร์ชันนี้',
  'app_update_dlg_ready_title': '%1$s พร้อมแล้ว',
  'app_update_dlg_ready_text': 'ดาวน์โหลดเสร็จแล้ว แตะเพื่อติดตั้ง',
  'app_update_dlg_ready_text_runtime': 'และรันไทม์ดาวน์โหลดเสร็จแล้ว แตะเพื่อติดตั้ง',
  'app_update_dlg_install': 'ติดตั้ง',
  'app_update_dlg_nospace_title': 'พื้นที่ไม่พอ',
  'app_update_dlg_nospace_text': 'ต้องการ %1$d MB แต่มีแค่ %2$d MB โปรดล้างพื้นที่แล้วลองใหม่',
  'app_update_dlg_ok': 'ตกลง',
  'app_update_choice_title': '%1$s จะเปลี่ยนรันไทม์',
  'app_update_choice_text': 'แอปเท่านั้น: %1$d MB ใช้ได้ทันที พร้อมรันไทม์ (%2$s → %3$s): %4$d MB เปิดครั้งแรกใช้ 1–3 นาที',
  'app_update_choice_app_only': 'แอปเท่านั้น',
  'app_update_choice_with_runtime': 'แอปพร้อมรันไทม์',
  'app_update_runtime_title': 'อัปเดตรันไทม์',
  'app_update_runtime_preparing': 'กำลังเตรียมรันไทม์…',
  'app_update_runtime_downloading': 'กำลังดาวน์โหลดรันไทม์ · %1$d%%',
  'app_update_runtime_extracting': 'กำลังติดตั้งรันไทม์ · %1$d%%',
  'app_update_runtime_paused': 'ดาวน์โหลดรันไทม์หยุดชั่วคราว',
  'app_update_runtime_done_title': 'รันไทม์พร้อมแล้ว',
  'app_update_runtime_done_text': 'รันไทม์ %1$s ติดตั้งเสร็จแล้ว เอนจินรีสตาร์ทแล้ว',
  'app_update_runtime_failed': 'อัปเดตรันไทม์ล้มเหลว: %1$s',
  'about_update_up_to_date': 'เป็นเวอร์ชันล่าสุดแล้ว (%1$s) · ตรวจสอบ %2$s',
  'about_update_available': '%1$s พร้อมใช้ (%2$d MB)',
  'about_update_available_metered': '%1$s พร้อมใช้ (%2$d MB) · ไม่อยู่บน Wi-Fi',
  'about_update_downloading': 'กำลังดาวน์โหลด · %1$d%%',
  'about_update_ready': '%1$s ดาวน์โหลดเสร็จ พร้อมติดตั้ง',
  'about_update_ignored': '%1$s ข้ามแล้ว · แตะเพื่ออัปเดตเอง',
  'about_update_unavailable': 'ไม่สามารถดึงข้อมูลอัปเดต: %1$s',
  'update_fail_no_index': 'ไม่พบดัชนีอัปเดต',
  'update_fail_network': 'ข้อผิดพลาดเครือข่าย',
  'update_fail_signature': 'ตรวจสอบลายเซ็นล้มเหลว',
  'update_fail_channel': 'ช่องอัปเดตไม่พร้อมใช้งาน',
  'update_fail_too_old': 'เวอร์ชันปัจจุบันเก่าเกินไป ไม่สามารถอัปเดตได้',
  'update_fail_no_asset': 'ไม่พบไฟล์อัปเดต',
  'update_fail_unknown': 'ข้อผิดพลาดไม่ทราบสาเหตุ',
  'about_update_install_failed': 'ติดตั้งอัปเดตล้มเหลว: %1$s',
  'about_update_tap_hint': 'แตะเพื่อดูรายละเอียด',
  'about_runtime_bg_started': 'เริ่มตรวจสอบรันไทม์ในพื้นหลัง',
  'about_runtime_checking_bg': 'กำลังตรวจสอบรันไทม์ในพื้นหลัง…',
  'settings_update_group': 'การอัปเดต',
  'settings_update_auto_check': 'ตรวจสอบอัปเดตอัตโนมัติ',
  'settings_update_wifi_only': 'ดาวน์โหลดเฉพาะ Wi-Fi',
  'settings_update_wifi_warn': 'เตือนก่อนดาวน์โหลดผ่านข้อมูลเคลื่อนที่',
  'settings_update_proxy_fallback': 'ใช้พร็อกซีถ้าตรงไม่ได้',
  'settings_update_proxy_fallback_desc': 'ลองดาวน์โหลดตรงก่อน หากล้มเหลวจึงใช้พร็อกซี',
  'settings_update_strategy': 'กลยุทธ์อัปเดต',
  'settings_update_strategy_desc': 'เลือกว่าจะจัดการอัปเดตอย่างไร',
  'settings_update_strategy_auto': 'อัตโนมัติ (ติดตั้งทันทีที่พร้อม)',
  'settings_update_strategy_keep': 'แจ้งเตือนเพื่อติดตั้งเอง',
  'settings_update_ignored_none': 'ไม่มีเวอร์ชันที่ข้ามไว้',
  'settings_update_clear': 'ล้างรายการข้าม',
  'settings_update_check_now': 'ตรวจสอบตอนนี้',
  'settings_update_auto_check_desc': 'ตรวจสอบอัปเดตใหม่เป็นระยะ',
  'settings_update_wifi_only_desc': 'ดาวน์โหลดเฉพาะต่อ Wi-Fi เท่านั้น',
  'settings_update_ignored': 'เวอร์ชันที่ข้ามไว้',
  'settings_update_ignored_code': 'versionCode %1$d',
  'settings_update_cleared': 'ล้างรายการข้ามแล้ว',
  'settings_update_check_now_desc': 'บังคับตรวจสอบอัปเดตทันที',
  'settings_update_check_started': 'เริ่มตรวจสอบอัปเดต…',
  'about_update_action_download': 'ดาวน์โหลด',
  'about_update_action_progress': 'กำลังดาวน์โหลด',
  'about_update_action_retry': 'ลองใหม่',
  'about_update_action_choose': 'เลือกประเภท',
  'about_update_delete_apk': 'ลบไฟล์ APK',
  'about_update_release': 'บันทึกการเปลี่ยนแปลง',
  'about_update_apk_deleted': 'ลบไฟล์ APK แล้ว',
  'about_update_installing': 'กำลังติดตั้ง…',
  'settings_section_system': 'ระบบ',
  'setting_maintenance': 'บำรุงรักษา',
  'setting_maintenance_sub': 'สำรองข้อมูล ทำความสะอาด รีเซ็ตหน้าแรก',
  'action_go_enable': 'ไปเปิดใช้งาน',
  'action_export': 'ส่งออก',
  'action_import': 'นำเข้า',
  'action_recover': 'กู้คืน',
  'action_check': 'ตรวจสอบ',
  'action_disable': 'ปิดใช้งาน',
  'action_restore': 'คืนค่า',
  'action_restart': 'รีสตาร์ท',
  'report_passed': '%1$d ผ่าน',
  'report_fixed': '%1$d แก้ไขแล้ว',
  'report_warned': '%1$d คำเตือน',
  'report_failed': '%1$d ล้มเหลว',
  'report_copy': 'คัดลอกรายงาน',
  'report_error': 'ข้อผิดพลาด',
  'restart_confirm_title': 'ยืนยันการรีสตาร์ท',
  'restart_confirm_body': 'ต้องการรีสตาร์ทเอนจินใช่ไหม? เซสชันที่ทำงานอยู่จะไม่ได้รับผลกระทบ',
  'setting_backup': 'สำรองข้อมูล',
  'setting_backup_sub': 'ส่งออกการตั้งค่าและข้อมูลเซสชัน',
  'setting_update_entry_sub': 'เวอร์ชัน %1$s · ตรวจสอบอัตโนมัติและโหมดแพ็กเกจ',
  'setting_update_entry_has_new': 'มีเวอร์ชันใหม่ %1$s พร้อมใช้',
  'settings_runtime_current': 'รันไทม์ที่ติดตั้ง: %1$s',
  'settings_update_prefs_header': 'การตั้งค่าอัปเดต',
  'settings_section_personalization': 'การปรับแต่ง',
  'setting_appearance_sub': '%1$s · %2$s',
  'setting_extension_entry_sub': 'สโตร์ ปลั๊กอิน เสียง เพท · %1$d ใช้งานอยู่',
  'setting_deep_clean': 'ทำความสะอาดลึก',
  'setting_deep_clean_sub': 'ล้างแคช บันทึก ไฟล์ชั่วคราว และข้อมูลที่ไม่ได้ใช้',
  'setting_deep_clean_sub_usage': 'พื้นที่ที่ล้างได้: %1$s',
  'setting_reset_home': 'รีเซ็ตหน้าแรก',
  'setting_reset_home_sub': 'คืนค่ารูปแบบหน้าแรกและการจัดวางเป็นค่าเริ่มต้น',
  'setting_reset_home_sub_usage': 'ทุกอย่างใน dsh-home: %1$s',
  'action_fix': 'แก้ไข',
  'setting_fix_owner': 'แก้ไขเจ้าของไฟล์',
  'setting_fix_owner_sub': 'แก้ไขสิทธิ์ไฟล์ที่เสียหายจากการคัดลอกหรือสำรองข้อมูล',
  'fix_owner_progress': 'กำลังแก้ไขสิทธิ์ไฟล์…',
  'fix_owner_ok': 'แก้ไขสิทธิ์เสร็จสิ้น',
  'fix_owner_fail': 'แก้ไขสิทธิ์ล้มเหลว',
  'fix_owner_none': 'ไม่มีไฟล์ที่ต้องแก้ไข',
  'action_clean': 'ล้าง',
  'action_reset': 'รีเซ็ต',
  'action_choose_backup': 'เลือกไฟล์สำรอง',
  'action_restart_now': 'รีสตาร์ทตอนนี้',
  'deep_clean_confirm_body': 'นี่จะลบ %1$s ของแคชและเศษปลั๊กอิน; จะสร้างใหม่ในครั้งถัดไปที่เริ่มต้น\n\nเก็บไว้: ข้อมูลรับรอง API, เซสชัน, พื้นที่ทำงาน, การตั้งค่าปลั๊กอิน, กุญแจ SSH',
  'reset_home_confirm_body': 'นี่จะลบทุกอย่างใน dsh-home (%1$s):\n\n- ข้อมูลรับรอง API (คุณจะต้องลงชื่อเข้าใช้ใหม่)\n- เซสชันและพื้นที่ทำงานทั้งหมด\n- การตั้งค่าปลั๊กอิน\n- กุญแจ SSH\n\nแอปและรันไทม์เอนจินจะถูกเก็บไว้ จึงไม่ต้องดาวน์โหลดใหม่\nจะเขียนสำรองข้อมูลก่อน',
  'reset_final_title': 'รีเซ็ตเสร็จสิ้น',
  'reset_final_body': 'หน้าแรกถูกรีเซ็ตแล้ว เอนจินจะรีสตาร์ทเพื่อโหลดค่าเริ่มต้น',
  'reset_type_hint': 'พิมพ์ "ยืนยัน" เพื่อดำเนินการต่อ',
  'reset_wrong_word': 'คำยืนยันไม่ตรง โปรดลองใหม่',
  'backup_running': 'กำลังสำรองข้อมูล…',
  'backup_progress': 'กำลังสำรองข้อมูล: %1$s เขียนแล้ว',
  'backup_unavailable': 'ไม่สามารถเปิดตำแหน่งบันทึกได้: %1$s',
  'backup_failed_title': 'สำรองข้อมูลล้มเหลว',
  'backup_failed_body': 'ไม่มีอะไรถูกลบเลย\n\n%1$s\n\nใช้โฟลเดอร์ในเครื่อง (ไม่ใช่ผู้ให้บริการคลาวด์) แล้วลองใหม่',
  'clean_running': 'กำลังทำความสะอาด…',
  'clean_done_title': 'ทำความสะอาดเสร็จสิ้น',
  'clean_partial_title': 'ทำความสะอาดบางส่วน',
  'clean_summary_removed': 'ลบแล้ว: %1$d รายการ, %2$s',
  'clean_summary_preserved': 'เก็บไว้: %1$s',
  'clean_summary_failed': 'ลบไม่ได้: %1$s',
  'clean_summary_backup_hint': 'เคล็ดลับ: สำรองข้อมูลก่อนทำความสะอาดลึก',
  'clean_summary_reset_hint': 'เคล็ดลับ: รีเซ็ตหน้าแรกหากยังมีปัญหา',
  'clean_calculating': 'กำลังคำนวณพื้นที่…',
  'boot_step_log_sweep': 'กำลังล้างบันทึกเก่า…',
  'settings_section_voice_plugins': 'ปลั๊กอินเสียง',
  'setting_voice_plugins_sub': 'จัดการปลั๊กอิน TTS และ STT',
  'plugin_install_timeout': 'ติดตั้งปลั๊กอินนานเกินไป',
  'plugin_net_error': 'ข้อผิดพลาดเครือข่าย',
  'setting_official_ui': 'UI อย่างเป็นทางการ',
  'setting_official_ui_sub': 'ใช้ UI ต้นฉบับของ DSH แทน UI ปรับแต่ง',
  'setting_official_ui_restart_hint': 'ต้องรีสตาร์ทเอนจินเพื่อมีผล',
  'pet_status_label': 'สถานะเพท',
  'pet_action_download': 'ดาวน์โหลด',
  'pet_action_import': 'นำเข้า',
  'pet_action_change': 'เปลี่ยน',
  'pet_action_adjust': 'ปรับแต่ง',
  'pet_action_try': 'ลองใช้',
  'pet_action_upgrade': 'อัปเกรด',
  'pet_action_restart': 'รีสตาร์ท',
  'pet_pack_show_list': 'แสดงรายการแพ็ก',
  'pet_pack_hide_list': 'ซ่อนรายการแพ็ก',
  'pet_pack_use': 'ใช้แพ็กนี้',
  'pet_pack_fetching': 'กำลังดึงข้อมูลแพ็ก…',
  'pet_pack_is_current': 'ใช้แพ็กนี้อยู่แล้ว',

  // New keys from upstream/main (v1.5.0-beta device capabilities)
  'notif_channel_reminder': 'การแจ้งเตือนของ AI',
  'notif_channel_silent': 'การแจ้งเตือนเงียบของ AI',
  'reminder_action_ack': 'รับทราบ',
  'reminder_action_snooze': 'เลื่อน 10 นาที',
  'settings_perm_group_device': 'ความสามารถอุปกรณ์ AI',
  'setting_cap_status': 'สถานะอุปกรณ์',
  'setting_cap_status_sub': 'แบตเตอรี่ การชาร์จ หน้าจอ เครือข่าย ระดับเสียง — อ่านอย่างเดียว',
  'setting_cap_sensor': 'เซ็นเซอร์',
  'setting_cap_sensor_sub': 'แสงรอบข้าง ความใกล้ชิด การเคลื่อนไหว — อ่านอย่างเดียว',
  'setting_cap_notify': 'ส่งการแจ้งเตือน',
  'setting_cap_notify_sub': 'ให้ AI ส่งผลงานและการเตือนถึงคุณ',
  'setting_cap_notify_need': 'อนุญาตสิทธิ์การแจ้งเตือนก่อน (Android 13+)',
  'setting_cap_clip': 'คลิปบอร์ด',
  'setting_cap_clip_sub': 'อ่านและเขียนคลิปบอร์ด',
  'setting_cap_control': 'ควบคุมอุปกรณ์',
  'setting_cap_control_sub': 'สลับ Wi-Fi, Bluetooth, เสียง และโหมดเรียก',
  'setting_cap_sched': 'การแจ้งเตือนตามกำหนด',
  'setting_cap_sched_sub': 'ให้ AI โพสต์การแจ้งเตือนในภายหลัง',
  'setting_cap_wifi': 'ควบคุม WiFi',
  'setting_cap_wifi_sub': 'ให้ AI สแกนเครือข่าย อ่านรายละเอียดการเชื่อมต่อ และจับแพ็กเก็ต ไม่ใช่แค่เปิด/ปิด WiFi',
  'setting_cap_bt': 'ควบคุม Bluetooth',
  'setting_cap_bt_sub': 'ให้ AI สแกน โฆษณา และส่งแพ็กเก็ต Bluetooth จริง และอ่าน HCI trace',
  'setting_cap_notify_read': 'อ่านการแจ้งเตือน',
  'setting_cap_notify_read_sub': 'ให้ AI อ่านการแจจ้งเตือนจากแอปอื่น ต้องการสิทธิ์เข้าถึงการแจ้งเตือน',
  'setting_cap_notify_read_need': 'อนุญาตการเข้าถึงการแจ้งเตือนในการตั้งค่าระบบก่อน',
};

// Now I need to translate the remaining keys. Let me read the keys-to-translate.txt
const keysToTranslatePath = '/data/user/0/app.dsh.mobile/files/dsh-home/backups/pr-thai/keys-to-translate.txt';
const keysToTranslateContent = fs.readFileSync(keysToTranslatePath, 'utf8');
const keysToTranslate = keysToTranslateContent.trim().split('\n').map(line => {
  const key = line.trim();
  return { key, value: upstreamStrings[key] || '' };
}).filter(k => k.value);
console.log(`Keys to translate from file: ${keysToTranslate.length}`);

// Build final Thai strings
const finalThaiStrings = {};

// First, copy good keys from sync Thai
let copiedFromSync = 0;
let fixedFromSync = 0;
let overriddenFromSync = 0;
for (const [key, value] of Object.entries(syncThaiStrings)) {
  if (forkKeysToExclude.has(key)) {
    console.log(`Excluding fork key: ${key}`);
    continue;
  }
  if (forkValueFixes[key]) {
    finalThaiStrings[key] = forkValueFixes[key];
    fixedFromSync++;
  } else if (overrideTranslations[key]) {
    finalThaiStrings[key] = overrideTranslations[key];
    overriddenFromSync++;
  } else {
    finalThaiStrings[key] = value;
    copiedFromSync++;
  }
}
console.log(`Copied from sync: ${copiedFromSync}, Fixed: ${fixedFromSync}, Overridden: ${overriddenFromSync}`);

// Then add translations for missing keys
let translatedByMe = 0;
for (const { key, value } of keysToTranslate) {
  if (upstreamStrings[key]) {
    if (myTranslations[key]) {
      finalThaiStrings[key] = myTranslations[key];
      translatedByMe++;
    } else {
      // Need to translate - for now mark as TODO
      finalThaiStrings[key] = `[THAI_NEEDED] ${value}`;
    }
  }
}

// Also apply myTranslations for any upstream key that has a translation but wasn't in keys-to-translate.txt
let additionalTranslated = 0;
for (const key of Object.keys(upstreamStrings)) {
  if (!finalThaiStrings[key] && myTranslations[key]) {
    finalThaiStrings[key] = myTranslations[key];
    additionalTranslated++;
  }
}
console.log(`Translated by me: ${translatedByMe}, Additional from myTranslations: ${additionalTranslated}`);

// Check for any upstream keys still missing
let missing = 0;
for (const key of Object.keys(upstreamStrings)) {
  if (!finalThaiStrings[key]) {
    console.log(`MISSING: ${key} = ${upstreamStrings[key]}`);
    missing++;
  }
}
console.log(`Missing keys: ${missing}`);

// Generate XML
let xml = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n';
for (const key of Object.keys(upstreamStrings)) {
  const value = finalThaiStrings[key] || upstreamStrings[key];
  // Escape special characters
  const escapedValue = value
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/'/g, '\\\'')
    .replace(/"/g, '"');
  xml += `    <string name="${key}">${escapedValue}</string>\n`;
}
xml += '</resources>\n';

const outputPath = '/data/user/0/app.dsh.mobile/files/dsh-home/DSH-Fork/agent-work/app/src/main/res/values-th/strings.xml';
fs.writeFileSync(outputPath, xml);
console.log(`Written to ${outputPath}`);

// Count keys in output
const outputKeys = parseStringsXml(xml);
console.log(`Output keys: ${Object.keys(outputKeys).length}`);

// Report TODO keys
const todoKeys = Object.entries(finalThaiStrings).filter(([_, v]) => v.startsWith('[THAI_NEEDED]'));
console.log(`\nTODO keys needing translation: ${todoKeys.length}`);
todoKeys.slice(0, 20).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
if (todoKeys.length > 20) {
  console.log(`  ... and ${todoKeys.length - 20} more`);
}