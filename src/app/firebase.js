import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD9AcAS2LEJXfaiAt0F5EG04UpvnkUxXsc",
  authDomain: "math-game-db-c0109.firebaseapp.com",
  projectId: "math-game-db-c0109",
  storageBucket: "math-game-db-c0109.firebasestorage.app",
  messagingSenderId: "609833081083",
  appId: "1:609833081083:web:53d6f783406c543142785e",
  measurementId: "G-0SPSWMLT7F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// --- Helper Functions ---

// 1. ฟังก์ชันบันทึกคะแนน (รับชื่อ, คะแนน, และคอมโบ)
export const saveScoreToFirebase = async (name, score, combo = 0) => {
  try {
    const docRef = await addDoc(collection(db, "scores"), {
      name: name,
      score: score,
      combo: combo,
      timestamp: new Date().toISOString() // เก็บเวลาเพื่อใช้ดูย้อนหลัง
    });
    console.log("Score saved with ID: ", docRef.id);
    return true;
  } catch (e) {
    console.error("Error adding document: ", e);
    return false;
  }
};

// 2. ฟังก์ชันดึง Leaderboard (รับจำนวนที่ต้องการดึง เช่น 10 อันดับ)
export const getTopScores = async (limitCount = 10) => {
  try {
    const scoresRef = collection(db, "scores");
    // เรียงจากคะแนนมากไปน้อย (desc)
    const q = query(scoresRef, orderBy("score", "desc"), limit(limitCount));
    
    const querySnapshot = await getDocs(q);
    
    // แปลงข้อมูลให้อยู่ในรูปแบบ Array ที่ Component เอาไปใช้ได้
    const scores = [];
    querySnapshot.forEach((doc) => {
      scores.push({ id: doc.id, ...doc.data() });
    });
    
    return scores;
  } catch (e) {
    console.error("Error getting documents: ", e);
    return [];
  }
};