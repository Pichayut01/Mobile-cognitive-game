# Mobile App - Tauri Android Delivery

เอกสารนี้สรุปวิธีติดตั้ง ใช้งาน ส่งมอบ และ build แอป Android จากโปรเจกต์นี้สำหรับลูกค้าและทีมพัฒนา

## สถานะไฟล์ส่งมอบ

ไฟล์ APK ที่พร้อมติดตั้งอยู่ที่:

```text
apk/mobile-app-0.1.0-universal-release-signed.apk
```

รายละเอียดไฟล์:

| รายการ | ค่า |
| --- | --- |
| ชื่อแอป | mobile-app |
| เวอร์ชัน | 0.1.0 |
| Android package identifier | com.newsk.mobileapp |
| ประเภทไฟล์ | Universal APK |
| สถาปัตยกรรมที่รองรับ | arm64-v8a, armeabi-v7a, x86, x86_64 |
| ลายเซ็น | Android debug keystore สำหรับ sideload |
| SHA-256 | 150886AAB2361D8EFE7A7D6A0AE3CAC7672604D53E93AB7B47E6C86F9B7F4C07 |

หมายเหตุ: APK นี้สามารถติดตั้งแบบ sideload บนเครื่อง Android ได้ทันที แต่ยังไม่ใช่ release key สำหรับนำขึ้น Google Play Store หากต้องการเผยแพร่ผ่าน Play Store ควร sign ด้วย production keystore ของเจ้าของแอปก่อนส่งขึ้น store

## วิธีติดตั้งบนเครื่อง Android

1. ส่งไฟล์ `apk/mobile-app-0.1.0-universal-release-signed.apk` เข้าโทรศัพท์ Android
2. เปิดไฟล์ APK บนเครื่อง Android
3. หากระบบถามเรื่องความปลอดภัย ให้เปิดอนุญาต `Install unknown apps` สำหรับแอปที่ใช้เปิดไฟล์ เช่น Files, Chrome หรือ LINE
4. กด `Install`
5. เมื่อติดตั้งเสร็จ กด `Open` เพื่อเปิดใช้งาน

หากเคยติดตั้งเวอร์ชันก่อนหน้าไว้แล้วและติดตั้งทับไม่ได้ ให้ถอนการติดตั้งแอปเดิมก่อน แล้วติดตั้ง APK ใหม่นี้อีกครั้ง

## ภาพรวมแอป

โปรเจกต์นี้เป็นแอป Android ที่สร้างด้วย Tauri v2, React และ Vite โดยเน้นเกมฝึกทักษะการรับรู้และระบบบันทึกผลการเล่นในเครื่องผู้ใช้

ฟีเจอร์หลัก:

- ระบบลงทะเบียนและเข้าใช้งานด้วยข้อมูลผู้ใช้ในเครื่อง
- หน้าเลือกเกม
- หน้า dashboard สรุปผลรวมของผู้เล่น
- ระบบบันทึก session การเล่นเกม
- ระบบคำนวณคะแนนรายเกมและคะแนนตามกลุ่มทักษะ
- เก็บข้อมูลสถิติผ่าน SQLite เมื่อรันใน Tauri
- มี fallback เป็น `localStorage` เมื่อรันบน browser สำหรับ development

เกมที่มีในแอป:

| Route | วัตถุประสงค์ |
| --- | --- |
| `/game/visual-search` | ฝึกการสังเกตและค้นหาเป้าหมาย |
| `/game/number-ordering` | ฝึกความเร็วและการเรียงลำดับตัวเลข |
| `/game/back-trace` | ฝึกความจำระยะสั้นและการย้อนจำเส้นทาง |
| `/game/switch-rules` | ฝึกการปรับตัวตามกติกาที่เปลี่ยน |
| `/game/memory-matrix` | ฝึกความจำเชิงตำแหน่ง |

## โครงสร้างโปรเจกต์

```text
.
+-- apk/
|   +-- mobile-app-0.1.0-universal-release-signed.apk
+-- public/
+-- scripts/
|   +-- run-tauri-mobile.mjs
+-- src/
|   +-- components/
|   +-- hooks/
|   +-- pages/
|   +-- styles/
|   +-- utils/
+-- src-tauri/
|   +-- capabilities/
|   +-- gen/android/
|   +-- migrations/
|   +-- src/
|   +-- tauri.conf.json
+-- index.html
+-- package.json
+-- package-lock.json
+-- vite.config.js
```

ส่วนสำคัญ:

| Path | รายละเอียด |
| --- | --- |
| `src/pages/` | หน้าหลักของแอป เช่น login, dashboard, หน้าเลือกเกม และหน้าเกม |
| `src/components/` | component ที่ใช้ซ้ำในหน้า auth, dashboard และ game summary |
| `src/utils/gameStatsStorage.js` | logic บันทึกและอ่านสถิติการเล่น |
| `src/utils/cognitiveDomainScoring.js` | logic คำนวณคะแนนตามกลุ่มทักษะ |
| `src-tauri/migrations/` | SQL migrations สำหรับ SQLite |
| `src-tauri/src/lib.rs` | จุดเริ่มต้นฝั่ง Tauri/Rust และ plugin setup |
| `scripts/run-tauri-mobile.mjs` | helper script สำหรับตรวจหา Android SDK, NDK และ Java บน Windows |

## ข้อกำหนดสำหรับเครื่องพัฒนา

ใช้เฉพาะเมื่อจำเป็นต้องแก้โค้ดหรือ build APK ใหม่

- Windows 10/11
- Node.js 22 หรือใหม่กว่า
- npm 11 หรือใหม่กว่า
- Rust toolchain พร้อม Android targets
- Android Studio
- Android SDK
- Android NDK
- Java จาก Android Studio JBR หรือ JDK ที่เข้ากันได้

ตรวจสอบเครื่อง:

```bash
node -v
npm -v
rustc --version
cargo --version
rustup target list --installed
adb devices
```

Android targets ที่ควรมี:

```text
aarch64-linux-android
armv7-linux-androideabi
i686-linux-android
x86_64-linux-android
```

## การติดตั้ง dependency

```bash
npm install
```

## การรันแบบ development

รัน frontend บน browser:

```bash
npm run dev
```

รัน Tauri desktop:

```bash
npm run tauri dev
```

รันบน Android emulator หรือเครื่อง Android ที่ต่อผ่าน USB:

```bash
npm run android:dev
```

## การ build APK ใหม่

Build APK:

```bash
npm run android:build:apk
```

ตำแหน่ง output จาก Tauri/Gradle:

```text
src-tauri/gen/android/app/build/outputs/apk/
```

ตัวอย่างไฟล์ release unsigned ที่ Tauri สร้าง:

```text
src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk
```

หากต้องการไฟล์สำหรับติดตั้งทันที ต้อง sign APK ก่อนนำไปส่งต่อ

## การ sign APK สำหรับ sideload

ตัวอย่างการ sign ด้วย debug keystore ของ Android:

```powershell
$buildTools = Get-ChildItem "$env:ANDROID_HOME\build-tools" -Directory | Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty FullName
$zipalign = Join-Path $buildTools "zipalign.exe"
$apksigner = Join-Path $buildTools "apksigner.bat"
$unsigned = "src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk"
$aligned = "apk\mobile-app-0.1.0-universal-release-aligned.apk"
$signed = "apk\mobile-app-0.1.0-universal-release-signed.apk"

& $zipalign -p -f 4 $unsigned $aligned
& $apksigner sign --ks "$env:USERPROFILE\.android\debug.keystore" --ks-pass pass:android --key-pass pass:android --out $signed $aligned
& $apksigner verify --verbose --print-certs $signed
```

สำหรับ production release ควรใช้ keystore ของเจ้าของแอป ไม่ควรใช้ debug keystore

## การติดตั้งผ่าน ADB

เมื่อต่อเครื่อง Android ผ่าน USB และเปิด USB debugging แล้ว:

```bash
adb devices
adb install -r apk/mobile-app-0.1.0-universal-release-signed.apk
```

หากติดตั้งทับไม่ได้:

```bash
adb uninstall com.newsk.mobileapp
adb install apk/mobile-app-0.1.0-universal-release-signed.apk
```

## การจัดการข้อมูลในเครื่อง

แอปใช้ SQLite database ชื่อ:

```text
game_stats.db
```

ข้อมูลหลักที่บันทึก:

- ผู้เล่นปัจจุบัน
- session การเล่นเกม
- คะแนน
- ระยะเวลาการเล่น
- จำนวนข้อผิดพลาด
- level ที่เล่นถึง
- metrics สำหรับคำนวณสถิติรายเกมและภาพรวม

เมื่อรันใน browser development และไม่อยู่ใน Tauri environment แอปจะใช้ `localStorage` เป็น fallback

## การตั้งค่าแอป

ไฟล์ config หลัก:

```text
src-tauri/tauri.conf.json
```

ค่าที่ควรรู้:

```json
{
  "productName": "mobile-app",
  "version": "0.1.0",
  "identifier": "com.newsk.mobileapp"
}
```

หากต้องเปลี่ยนชื่อแอปหรือ package ก่อนส่ง production:

1. แก้ `productName`
2. แก้ `identifier`
3. build Android ใหม่
4. sign APK ใหม่
5. ทดสอบติดตั้งบนเครื่องจริง

## Git และไฟล์ที่ควร commit

ไฟล์ที่ควรเก็บใน git:

- source code ใน `src/`
- Tauri/Rust code ใน `src-tauri/`
- Android generated project ที่จำเป็นใน `src-tauri/gen/android/`
- migration SQL
- `package.json`
- `package-lock.json`
- README
- APK signed สำหรับส่งมอบลูกค้าใน `apk/`

ไฟล์ที่ไม่ควร commit:

- `node_modules/`
- `dist/`
- `src-tauri/target/`
- Gradle build output
- keystore ส่วนตัว
- `.env`
- APK intermediate เช่น aligned APK และ `.idsig`

## Troubleshooting

### Build หา Android SDK หรือ NDK ไม่เจอ

ให้ติดตั้ง Android Studio พร้อม Android SDK และ NDK หรือกำหนด environment variables:

```powershell
$env:ANDROID_HOME="C:\Users\<user>\AppData\Local\Android\Sdk"
$env:NDK_HOME="$env:ANDROID_HOME\ndk\<version>"
```

### `adb devices` ไม่เจอเครื่อง

- เปิด Developer options บนมือถือ
- เปิด USB debugging
- เปลี่ยนโหมด USB เป็น File Transfer หากจำเป็น
- ยืนยัน RSA fingerprint prompt บนมือถือ
- ลองถอดเสียบสาย USB ใหม่

### ติดตั้ง APK ไม่ได้เพราะลายเซ็นไม่ตรง

เกิดได้เมื่อเครื่องเคยติดตั้งแอป package เดียวกันแต่ sign ด้วย key คนละชุด ให้ถอนการติดตั้งแอปเดิมก่อน:

```bash
adb uninstall com.newsk.mobileapp
```

### Build release ได้ไฟล์ unsigned

ไฟล์ `app-universal-release-unsigned.apk` ยังติดตั้งไม่ได้โดยตรง ต้อง sign ด้วย `apksigner` ก่อน

## Release checklist

ก่อนส่งไฟล์ให้ลูกค้า:

- Build APK ล่าสุดแล้ว
- Sign APK แล้ว
- Verify signature ด้วย `apksigner verify`
- ทดสอบติดตั้งบนเครื่อง Android จริงอย่างน้อย 1 เครื่อง
- เปิดแอปได้
- สมัคร/เข้าใช้งานได้
- เล่นเกมได้
- Dashboard แสดงผลหลังจบเกมได้
- ยืนยันว่าไฟล์ที่ส่งคือ `mobile-app-0.1.0-universal-release-signed.apk`
