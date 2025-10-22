import axios from "axios";

// ถ้าใช้ Android Emulator:
//  - Android Studio emulator ใช้ http://10.0.2.2:8080
//  - Genymotion ใช้ http://10.0.3.2:8080
// ถ้าทดสอบบนมือถือจริง: ใส่ IP เครื่องคอมพ์แทน localhost
export const http = axios.create({
  baseURL: "http://localhost:8080/api",
  timeout: 10000,
});
