import type React from "react"
import type { Metadata } from "next"
import { Inter, Playfair_Display, Fira_Code } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" })
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "NeuroFlow Admin Dashboard",
  description: "AI Marketing Automation System - Admin Dashboard",
  generator: "v0.app",
  icons: ['https://neuroflowai.co.uk/NeuroFlow_AI_Logo.png']
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Poppins:wght@400;700&family=Lato:wght@400;700&family=Raleway:wght@400;700&family=Open+Sans:wght@400;700&family=Roboto:wght@400;700&family=Playfair+Display:wght@400;700&family=Oswald:wght@400;700&family=Nunito:wght@400;700&family=Bebas+Neue&family=Anton&family=Outfit:wght@400;700&family=DM+Sans:wght@400;700&family=Cinzel:wght@400;700&family=Quicksand:wght@400;700&family=Pacifico&family=Lobster&family=Cormorant+Garamond:wght@400;700&family=Inconsolata&family=Barlow+Condensed:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} ${firaCode.variable}`}>
        <div className="font-sans antialiased">
          {children}
          <Analytics />
        </div>
      </body>
    </html>
  )
}
