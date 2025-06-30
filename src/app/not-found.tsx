"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search, AlertCircle } from "lucide-react";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="min-h-[60vh] relative w-full overflow-hidden">
      

      <div className="container mx-auto flex flex-col items-center justify-center h-[80vh] px-4 max-w-screen-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6"
        >
          {/* 404 Number */}
          <div className="relative">
            <h1 className="text-9xl font-bold text-primary/10 dark:text-primary/5 select-none">
              404
            </h1>
            {/* <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <AlertCircle className="h-16 w-16 text-tertiary" />
            </div> */}
          </div>

          {/* Error message */}
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-semibold">
              Page Not Found
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          {/* Action card */}
          <div>
            
             
                <div className="flex justify-center">
                  <Button
                    className="bg-tertiary hover:bg-tertiary/90 gap-2"
                    asChild
                  >
                    <Link href="/" className="flex items-center  text-white">
                      <Home className="h-4 w-4 t" />
                      Return Home
                    </Link>
                  </Button>
                </div>
              
            
          </div>
        </motion.div>
      </div>
    </main>
  );
}