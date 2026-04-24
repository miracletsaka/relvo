'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Copy, Trash2 } from 'lucide-react'
import type { TextElement } from './canvas-editor'

const FONT_FAMILIES = [
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Sans-Serif', value: 'Arial, sans-serif' },
  { name: 'Monospace', value: 'Courier New, monospace' },
  { name: 'Playfair', value: '"Playfair Display", serif' },
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Poppins', value: 'Poppins, sans-serif' }
]

const COLORS = [
  '#FFFFFF', '#000000', '#D4A574', '#8B7355',
  '#E8E8E8', '#F5F5DC', '#C0A080', '#6B4423'
]

interface TextEditorPanelProps {
  elements: TextElement[]
  selectedElementId: string | null
  onAddElement: (element: TextElement) => void
  onUpdateElement: (element: TextElement) => void
  onDeleteElement: (id: string) => void
  onDuplicateElement: (id: string) => void
}

export default function TextEditorPanel({
  elements,
  selectedElementId,
  onAddElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement
}: TextEditorPanelProps) {
  const selectedElement = elements.find(el => el.id === selectedElementId)

  const handleAddElement = () => {
    const newElement: TextElement = {
      id: `text-${Date.now()}`,
      text: 'New Text',
      x: 50,
      y: 50 + elements.length * 80,
      fontSize: 32,
      fontFamily: 'Georgia, serif',
      fontWeight: 'bold',
      color: '#FFFFFF',
      textAlign: 'left',
      maxWidth: 500,
      zIndex: elements.length
    }
    onAddElement(newElement)
  }

  return (
    <div className="space-y-6">
      {/* Add Element Button */}
      <Button
        onClick={handleAddElement}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Text Element
      </Button>

      {/* Elements List */}
      <Card className="p-4 border-border">
        <h3 className="font-semibold text-foreground mb-3">Text Elements</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {elements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No text elements yet</p>
          ) : (
            elements.map(element => (
              <button
                key={element.id}
                className={`w-full p-3 text-left rounded-lg border transition-all text-sm truncate ${
                  selectedElementId === element.id
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50 bg-secondary'
                }`}
                onClick={() => {
                  // Component will need to expose selection
                }}
              >
                <div className="font-medium text-foreground truncate">
                  {element.text.substring(0, 50)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {element.fontSize}px • {element.fontFamily.split(',')[0]}
                </div>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Text Editor Panel */}
      {selectedElement && (
        <Card className="p-4 border-border space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Edit Text</h3>
            <div className="flex gap-2">
              <button
                onClick={() => onDuplicateElement(selectedElement.id)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteElement(selectedElement.id)}
                className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Text Content */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Text Content
            </label>
            <Textarea
              value={selectedElement.text}
              onChange={(e) =>
                onUpdateElement({ ...selectedElement, text: e.target.value })
              }
              className="bg-secondary text-foreground border-border"
              rows={3}
            />
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Font Family
            </label>
            <select
              value={selectedElement.fontFamily}
              onChange={(e) =>
                onUpdateElement({ ...selectedElement, fontFamily: e.target.value })
              }
              className="w-full px-3 py-2 bg-secondary text-foreground border border-border rounded-lg text-sm"
            >
              {FONT_FAMILIES.map(font => (
                <option className="text-black" key={font.value} value={font.value}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Font Size: {selectedElement.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="120"
              value={selectedElement.fontSize}
              onChange={(e) =>
                onUpdateElement({
                  ...selectedElement,
                  fontSize: parseInt(e.target.value)
                })
              }
              className="w-full"
            />
          </div>

          {/* Font Weight */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Font Weight
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['normal', 'bold', '600', '700'].map(weight => (
                <button
                  key={weight}
                  onClick={() =>
                    onUpdateElement({
                      ...selectedElement,
                      fontWeight: weight as any
                    })
                  }
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    selectedElement.fontWeight === weight
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-foreground hover:border-accent border border-border'
                  }`}
                  style={{ fontWeight: weight as any }}
                >
                  {weight}
                </button>
              ))}
            </div>
          </div>

          {/* Text Alignment */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Text Alignment
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['left', 'center', 'right'] as const).map(align => (
                <button
                  key={align}
                  onClick={() =>
                    onUpdateElement({ ...selectedElement, textAlign: align })
                  }
                  className={`py-2 px-3 rounded-lg text-sm capitalize font-medium transition-all ${
                    selectedElement.textAlign === align
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-foreground hover:border-accent border border-border'
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Text Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => onUpdateElement({ ...selectedElement, color })}
                  className={`w-full h-10 rounded-lg border-2 transition-all ${
                    selectedElement.color === color
                      ? 'border-accent'
                      : 'border-border hover:border-accent/50'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="mt-2">
              <Input
                type="color"
                value={selectedElement.color}
                onChange={(e) =>
                  onUpdateElement({ ...selectedElement, color: e.target.value })
                }
                className="h-10 w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Max Width */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Max Width: {selectedElement.maxWidth}px
            </label>
            <input
              type="range"
              min="100"
              max="900"
              value={selectedElement.maxWidth}
              onChange={(e) =>
                onUpdateElement({
                  ...selectedElement,
                  maxWidth: parseInt(e.target.value)
                })
              }
              className="w-full"
            />
          </div>

          {/* Position Info */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Position: {Math.round(selectedElement.x)}, {Math.round(selectedElement.y)} px
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
