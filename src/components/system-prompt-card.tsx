"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Settings, Sparkles, RotateCcw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useApi } from "@/providers/backend"
import { useSidebar } from "@/components/ui/sidebar"
import { toast } from "sonner"
import Image from "next/image"

interface CustomPromptResponse {
  custom_system_prompt: string | null
}

export default function SystemPromptCard() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState<string>("")
  const [editPrompt, setEditPrompt] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const api = useApi()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  // Default system prompt for display
  const defaultPrompt = ""
    
  // Fetch current custom prompt only once
  useEffect(() => {
    if (hasFetched) return // Skip if already fetched
    
    const fetchCustomPrompt = async () => {
      try {
        setIsLoading(true)
        const response = await api.get<CustomPromptResponse>('/users/custom-prompt')
        const prompt = response.custom_system_prompt || defaultPrompt
        setCurrentPrompt(prompt)
        setEditPrompt(prompt)
        setHasFetched(true) // Mark as fetched
      } catch (error) {
        console.error('Error fetching custom prompt:', error)
        setCurrentPrompt(defaultPrompt)
        setEditPrompt(defaultPrompt)
        setHasFetched(true) // Mark as fetched even on error to prevent retry loops
      } finally {
        setIsLoading(false)
      }
    }

    fetchCustomPrompt()
  }, [api, hasFetched])

  // Save custom prompt
  const handleSave = async () => {
    try {
      setIsSaving(true)
      await api.post('/users/custom-prompt', {
        custom_system_prompt: editPrompt.trim() || null
      })
      setCurrentPrompt(editPrompt.trim() || defaultPrompt)
      setIsOpen(false)
      toast.success("System prompt updated successfully!")
    } catch (error) {
      console.error('Error saving custom prompt:', error)
      toast.error("Failed to update system prompt. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Reset to default
  const handleReset = async () => {
    try {
      setIsSaving(true)
      await api.post('/users/custom-prompt', {
        custom_system_prompt: null
      })
      setCurrentPrompt(defaultPrompt)
      setEditPrompt(defaultPrompt)
      setIsOpen(false)
      toast.success("System prompt reset to default!")
    } catch (error) {
      console.error('Error resetting prompt:', error)
      toast.error("Failed to reset system prompt. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const isUsingCustomPrompt = currentPrompt !== defaultPrompt

  if (isCollapsed) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-full py-2 rounded-md hover:bg-slate-100"
            title="System Prompt Settings"
          >
            <Sparkles className="h-4 w-4 text-slate-600" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              AI System Prompt
            </DialogTitle>
            <DialogDescription>
              Customize how the AI assistant behaves and responds to your queries.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "calc(90vh - 220px)" }}>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Current System Prompt
              </label>
              <Textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Enter your custom system prompt..."
                className="min-h-[200px] resize-none"
                disabled={isLoading || isSaving}
              />
              <p className="text-xs text-slate-500 mt-2">
                {isUsingCustomPrompt ? "Using custom prompt" : "Using default prompt"}
              </p>
            </div>
          </div>

          <DialogFooter className="flex justify-between mt-6 gap-4">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSaving || isLoading}
              className="flex items-center gap-2"
              size="sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Default
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditPrompt(currentPrompt)
                  setIsOpen(false)
                }}
                disabled={isSaving}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="flex items-center gap-2"
                size="sm"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="mx-4 cursor-pointer hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex grid grid-cols-2  items-center gap-2.5">
                <Image src="/img/locky3.png" alt="Locky" width={200} height={200} className="col-span-1 " />
                <div className="col-span-1">
                  <h3 className="text-xs font-medium text-slate-900 mb-0.5">Edit Locky's System Prompt</h3>
                 
                </div>
              </div>
            
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI System Prompt
          </DialogTitle>
          <DialogDescription>
            Customize how the AI assistant behaves and responds to your queries.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "calc(90vh - 220px)" }}>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Current System Prompt
            </label>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Enter your custom system prompt..."
              className="h-[500px] w-full resize-none border border-slate-200 rounded-md p-2"
              disabled={isLoading || isSaving}
            />
            <p className="text-xs text-slate-500 mt-2">
              {isUsingCustomPrompt ? "Using custom prompt" : "Using default prompt"}
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between mt-6 gap-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2"
            size="sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditPrompt(currentPrompt)
                setIsOpen(false)
              }}
              disabled={isSaving}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex items-center gap-2"
              size="sm"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 