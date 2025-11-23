/*
Attendance Kiosk (Single-file React)
- ภาษา: UI ภาษาไทย
- เหมาะสำหรับวางบน iPad ของร้าน (kiosk mode)

คุณสมบัติหลัก
1) หน้า Admin ครั้งแรก: ตั้งค่าอีเมลเจ้าของและ PIN (เก็บใน localStorage)
2) ผูกอุปกรณ์: เมื่อเจ้าของล็อกอินครั้งแรก จะผูก "deviceId" ไว้ใน localStorage ของอุปกรณ์นั้น = เฉพาะไอแพดนี้เท่านั้นที่จะใช้โหมด kiosk ได้
3) หน้า kiosk: แสดงรายชื่อพนักงานเป็นปุ่ม (กด ลงชื่อเข้า / ลงชื่อออก แบบ real-time) แล้วบันทึกเวลา
4) บันทึกเก็บที่ localStorage (attendance_logs) — สามารถดาวน์โหลดเป็น CSV หรือดูรายงานได้
5) หน้า Admin มีปุ่ม Export CSV, ล้างข้อมูล, เปลี่ยนการตั้งค่า

วิธีใช้งานอย่างเร็ว
- สร้างโปรเจค React (Vite หรือ Create React App) แล้วนำไฟล์นี้เป็น App.jsx (หรือคัดวาง component เป็น App)
- เปิดบน iPad ด้วยเบราว์เซอร์ (แนะนำใช้ Safari ในโหมดเต็มจอ/เพิ่มหน้าเว็บไปยังหน้าจอโฮม)
- ครั้งแรก: กด "ตั้งค่าเจ้าของ" ใส่อีเมลและ PIN -> บันทึก -> ผูกอุปกรณ์
- พนักงานกดชื่อของตัวเองบนหน้า kiosk แล้วเลือก 'เข้า' หรือ 'ออก' -> กดบันทึก

หมายเหตุความปลอดภัย
- ระบบนี้เป็นระบบแบบ local (ไม่มี backend) จึงง่ายและใช้ได้ทันที แต่ถ้าต้องการความปลอดภัยสูง (เช่น เก็บบนเซิร์ฟเวอร์, ยืนยันตัวตนด้วยอีเมลจริง) จำเป็นต้องติดตั้ง backend เพิ่มเติม

*/

import React, { useEffect, useState } from 'react'

const EMPLOYEES = ['กุ๊ก','เจี๊ยบ','บี','จอย','ภู']

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function nowISO() {
  return new Date().toISOString()
}

function formatLocal(iso) {
  const d = new Date(iso)
  return d.toLocaleString('th-TH')
}

export default function App() {
  const [config, setConfig] = useState(null) // {ownerEmail, ownerPIN, deviceId}
  const [deviceId, setDeviceId] = useState(null)
  const [logs, setLogs] = useState([])
  const [view, setView] = useState('kiosk') // kiosk | admin | setup
  const [adminEmailInput, setAdminEmailInput] = useState('')
  const [adminPinInput, setAdminPinInput] = useState('')
  const [adminAuthPin, setAdminAuthPin] = useState('')
  const [message, setMessage] = useState('')

  useEffect(()=>{
    // load config and device id
    const cfg = JSON.parse(localStorage.getItem('kiosk_config') || 'null')
    setConfig(cfg)
    const did = localStorage.getItem('kiosk_deviceId') || null
    setDeviceId(did)
    const raw = JSON.parse(localStorage.getItem('attendance_logs') || '[]')
    setLogs(raw)
    if(!cfg) setView('setup')
  }, [])

  useEffect(()=>{
    localStorage.setItem('attendance_logs', JSON.stringify(logs))
  }, [logs])

  function saveConfig(newCfg) {
    localStorage.setItem('kiosk_config', JSON.stringify(newCfg))
    setConfig(newCfg)
  }

  function handleInitialSetup(){
    if(!adminEmailInput || !adminPinInput) { setMessage('กรุณากรอกอีเมลเจ้าของและ PIN'); return }
    // create device id and bind
    const did = uid()
    localStorage.setItem('kiosk_deviceId', did)
    setDeviceId(did)
    const newCfg = { ownerEmail: adminEmailInput, ownerPIN: adminPinInput, deviceId: did }
    saveConfig(newCfg)
    setMessage('ตั้งค่าเรียบร้อย — อุปกรณ์นี้ได้รับการผูกแล้ว')
    setView('kiosk')
  }

  function ownerLoginToBind(){
    // allow owner to login by email & pin to rebind device
    if(!config) return
    if(adminEmailInput === config.ownerEmail && adminPinInput === config.ownerPIN){
      const did = uid()
      localStorage.setItem('kiosk_deviceId', did)
      const newCfg = {...config, deviceId: did}
      saveConfig(newCfg)
      setDeviceId(did)
      setMessage('ผูกอุปกรณ์ใหม่เรียบร้อย')
      setView('kiosk')
    } else {
      setMessage('อีเมลหรือ PIN ไม่ถูกต้อง')
    }
  }

  function isDeviceAuthorized(){
    if(!config) return false
    return deviceId && config.deviceId === deviceId
  }

  function recordAttendance(name, type) {
    if(!isDeviceAuthorized()) { setMessage('อุปกรณ์นี้ยังไม่ได้รับอนุญาต ให้เจ้าของล็อกอินเพื่อตั้งค่า'); return }
    const entry = {
      id: uid(),
      name,
      type, // 'in' | 'out'
      time: nowISO()
    }
    const newLogs = [entry, ...logs]
    setLogs(newLogs)
    setMessage(`${name} ${type === 'in' ? 'ลงชื่อเข้า' : 'ลงชื่อออก'} เวลา ${formatLocal(entry.time)}`)
  }

  function exportCSV(){
    const header = ['id','name','type','time']
    const rows = logs.map(r => [r.id, r.name, r.type, r.time])
    const csv = [header, ...rows].map(r => r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'} )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function clearLogs(){
    if(!confirm('ต้องการล้างบันทึกทั้งหมดจริงหรือไม่?')) return
    setLogs([])
    setMessage('ล้างข้อมูลเรียบร้อย')
  }

  function adminAuthenticate(){
    if(!config){ setMessage('ยังไม่ได้ตั้งค่าเจ้าของ') ; return false }
    if(adminAuthPin === config.ownerPIN) return true
    setMessage('รหัสไม่ถูกต้อง')
    return false
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-2xl p-6">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">ระบบลงชื่อเข้า-ออก (Kiosk)</h1>
          <div>
            <button className="mr-2 p-2 rounded bg-blue-600 text-white" onClick={()=>setView('kiosk')}>Kiosk</button>
            <button className="p-2 rounded bg-gray-200" onClick={()=>setView('admin')}>Admin</button>
          </div>
        </header>

        {view === 'setup' && (
          <div>
            <h2 className="text-lg font-semibold mb-2">ตั้งค่าเจ้าของ & ผูกอุปกรณ์</h2>
            <p className="mb-4">ระบบจะผูกกับ iPad เครื่องที่กำลังใช้งาน เมื่อกรอกข้อมูลและกดบันทึกแล้ว อุปกรณ์นี้จะเป็นอุปกรณ์เดียวที่ใช้งาน kiosk ได้</p>
            <div className="space-y-2">
              <input className="w-full p-2 border rounded" placeholder="อีเมลเจ้าของ" value={adminEmailInput} onChange={e=>setAdminEmailInput(e.target.value)} />
              <input className="w-full p-2 border rounded" placeholder="ตั้ง PIN (ตัวเลขหรือข้อความสั้น)" value={adminPinInput} onChange={e=>setAdminPinInput(e.target.value)} />
              <div className="flex gap-2">
                <button className="p-2 bg-green-600 text-white rounded" onClick={handleInitialSetup}>บันทึก & ผูกอุปกรณ์</button>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-600">หมายเหตุ: หากต้องการผูกอุปกรณ์ใหม่ ให้ไปที่หน้า Admin แล้วเลือก "ผูกอุปกรณ์ใหม่" โดยเจ้าของต้องใส่อีเมลและ PIN</p>
          </div>
        )}

        {view === 'kiosk' && (
          <div>
            <h2 className="text-lg font-semibold mb-2">ลงชื่อเข้า-ออก (Kiosk)</h2>
            {!isDeviceAuthorized() && (
              <div className="p-3 mb-4 bg-yellow-50 border rounded text-sm">
                อุปกรณ์นี้ยังไม่ได้รับอนุญาตให้ใช้ kiosk กรุณาให้เจ้าของตั้งค่า (ไปที่ Admin)
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {EMPLOYEES.map(name=> (
                <div key={name} className="p-3 border rounded text-center">
                  <div className="font-medium mb-2">{name}</div>
                  <div className="flex gap-2 justify-center">
                    <button className="px-3 py-1 rounded bg-green-500 text-white" onClick={()=>recordAttendance(name,'in')}>ลงชื่อเข้า</button>
                    <button className="px-3 py-1 rounded bg-red-500 text-white" onClick={()=>recordAttendance(name,'out')}>ลงชื่อออก</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <h3 className="font-semibold">สถานะล่าสุด</h3>
              <div className="max-h-48 overflow-auto mt-2 border rounded p-2 bg-gray-50">
                {logs.length === 0 && <div className="text-sm text-gray-500">ยังไม่มีบันทึก</div>}
                {logs.map(l=> (
                  <div key={l.id} className="text-sm py-1 border-b last:border-b-0">
                    <strong>{l.name}</strong> — {l.type === 'in' ? 'เข้า' : 'ออก'} @ {formatLocal(l.time)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'admin' && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Admin</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 border rounded">
                <h4 className="font-medium mb-2">ตั้งค่าจริง/ผูกอุปกรณ์ใหม่</h4>
                <input className="w-full p-2 border rounded mb-2" placeholder="อีเมลเจ้าของ" value={adminEmailInput} onChange={e=>setAdminEmailInput(e.target.value)} />
                <input className="w-full p-2 border rounded mb-2" placeholder="PIN เจ้าของ" value={adminPinInput} onChange={e=>setAdminPinInput(e.target.value)} />
                <div className="flex gap-2">
                  <button className="p-2 bg-blue-600 text-white rounded" onClick={ownerLoginToBind}>ผูกอุปกรณ์ใหม่ (เจ้าของเท่านั้น)</button>
                </div>
                <p className="text-sm text-gray-500 mt-2">อีเมลเจ้าของปัจจุบัน: {config?.ownerEmail || '-'}</p>
                <p className="text-sm text-gray-500">deviceId ปัจจุบัน: {config?.deviceId ? config.deviceId : '-'}</p>
              </div>

              <div className="p-3 border rounded">
                <h4 className="font-medium mb-2">Export / จัดการบันทึก</h4>
                <div className="flex gap-2 mb-2">
                  <button className="p-2 bg-indigo-600 text-white rounded" onClick={()=>{ if(prompt('กรอก PIN เจ้าของ เพื่อยืนยัน') === config?.ownerPIN){ exportCSV() } else { setMessage('PIN ไม่ถูกต้อง') } }}>Export CSV</button>
                  <button className="p-2 bg-red-600 text-white rounded" onClick={()=>{ if(prompt('กรอก PIN เจ้าของ เพื่อยืนยัน การล้างข้อมูล') === config?.ownerPIN){ clearLogs() } else { setMessage('PIN ไม่ถูกต้อง') } }}>ล้างข้อมูล</button>
                </div>
                <div>
                  <h5 className="font-medium">ดูบันทึกดิบ (ล่าสุดแสดงด้านบน)</h5>
                  <div className="max-h-48 overflow-auto mt-2 border rounded p-2 bg-gray-50 text-sm">
                    {logs.length === 0 && <div className="text-gray-500">ไม่มีข้อมูล</div>}
                    {logs.map(l=> (
                      <div key={l.id} className="py-1 border-b last:border-b-0">
                        {l.name} — {l.type} — {formatLocal(l.time)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 border rounded">
              <h4 className="font-medium">การเข้าใช้งาน Admin (ล็อกด้วย PIN)</h4>
              <p className="text-sm text-gray-600 mb-2">กรอก PIN เจ้าของ แล้วกดยืนยัน เพื่อแสดงตัวเลือกเพิ่มเติม</p>
              <input className="w-1/2 p-2 border rounded mr-2" placeholder="PIN เจ้าของ" value={adminAuthPin} onChange={e=>setAdminAuthPin(e.target.value)} />
              <button className="p-2 bg-green-600 text-white rounded" onClick={()=>{ if(adminAuthenticate()){ alert('Authenticated: คุณเป็นเจ้าของ (แสดงตัวเลือกเพิ่มเติม)'); } }}>ยืนยัน</button>
            </div>

          </div>
        )}

        <footer className="mt-4 text-sm text-gray-600">
          <div>{message}</div>
          <div className="mt-2">หมายเหตุ: ระบบเก็บข้อมูลเฉพาะเครื่อง (localStorage) หากต้องการสำรอง ควร Export CSV เป็นระยะ</div>
        </footer>
      </div>
    </div>
  )
}
