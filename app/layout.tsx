import ChatWidget from './chat-widget';
import type { Metadata } from 'next'; import './globals.css';
export const metadata: Metadata = {title:'Dr. Kuladeep Lankipalli | General & Laparoscopic Surgeon',description:'Advanced surgical expertise. Human care. Discover Dr. Kuladeep Lankipalli at Yukta Speciality Clinics.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;600;700&family=Manrope:wght@400;500;600;700&display=swap"/></head><body>{children}<ChatWidget/></body></html>}
