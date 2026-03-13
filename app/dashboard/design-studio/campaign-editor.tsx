'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TemplateCanvas from '@/components/template-canvas'
import ShapeEditor from '@/components/shape-editor'
import CampaignDataForm from '@/components/campaign-data-form'
import TemplateManagerV2 from '@/components/template-manager-v2'
import SaveTemplateDialogV2 from '@/components/save-template-dialog-v2'
import ImageUploader from '@/components/image-uploader'
import { CampaignData, TemplateShape, Template } from '@/lib/types'
import { DEFAULT_CAMPAIGN_DATA } from '@/lib/campaign-context'
import { saveTemplate, getTemplates, renderTemplateWithData } from '@/lib/template-storage'
import { Download, Save, Plus } from 'lucide-react'

export default function CampaignEditorPage() {
  const [campaignData, setCampaignData] = useState<CampaignData>(DEFAULT_CAMPAIGN_DATA)
  const [shapes, setShapes] = useState<TemplateShape[]>([])
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [canvasWidth] = useState(1200)
  const [canvasHeight] = useState(675)

  // Add new shape
  const handleAddShape = (type: TemplateShape['type']) => {
    const newShape: TemplateShape = {
      id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      x: 50,
      y: 50,
      width: type === 'circle' ? 100 : 200,
      height: type === 'circle' ? 100 : 80,
      backgroundColor: type === 'text' ? undefined : '#ffffff',
      borderColor: '#000000',
      borderWidth: 1,
      textColor: '#000000',
      fontSize: 16,
      fontFamily: 'Century Gothic',
      fontWeight: 400,
      textAlign: 'left',
      padding: 8,
      opacity: 1,
      shadowBlur: 0,
      shadowX: 0,
      shadowY: 0,
      shadowColor: '#000000',
      zIndex: shapes.length + 1,
      dataField: type === 'text' ? 'hook' : undefined,
    }
    setShapes([...shapes, newShape])
    setSelectedShapeId(newShape.id)
  }

  // Update shape
  const handleUpdateShape = (updatedShape: TemplateShape) => {
    setShapes(shapes.map(s => (s.id === updatedShape.id ? updatedShape : s)))
  }

  // Delete shape
  const handleDeleteShape = (id: string) => {
    setShapes(shapes.filter(s => s.id !== id))
    if (selectedShapeId === id) {
      setSelectedShapeId(null)
    }
  }

  // Handle drag
  const handleShapeDrag = (id: string, x: number, y: number) => {
    setShapes(
      shapes.map(s =>
        s.id === id ? { ...s, x: Math.max(0, x), y: Math.max(0, y) } : s
      )
    )
  }

  // Handle resize
  const handleShapeResize = (id: string, width: number, height: number) => {
    setShapes(
      shapes.map(s =>
        s.id === id ? { ...s, width, height } : s
      )
    )
  }

  // Apply template to current design
  const handleApplyTemplate = (template: Template) => {
    setShapes(template.shapes)
    setBackgroundImage(template.backgroundImage)
    setSelectedShapeId(null)
  }

  // Export canvas as PNG
  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) return

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `campaign-${Date.now()}.png`
    link.click()
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Campaign Designer v1</h1>
          <p className="text-muted-foreground">
            Design reusable templates with shapes and text fields bound to campaign data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar */}
          <div className="space-y-6">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="template">Template</TabsTrigger>
              </TabsList>

              {/* Content Tab */}
              <TabsContent value="content" className="space-y-4">
                <CampaignDataForm
                  data={campaignData}
                  onChange={setCampaignData}
                />
              </TabsContent>

              {/* Template Tab */}
              <TabsContent value="template" className="space-y-4">
                <ShapeEditor
                  shapes={shapes}
                  selectedShapeId={selectedShapeId}
                  onShapeUpdate={handleUpdateShape}
                  onShapeDelete={handleDeleteShape}
                  onShapeAdd={handleAddShape}
                  campaignData={campaignData}
                />
              </TabsContent>
            </Tabs>

            {/* Image Uploader */}
            <Card className="p-4 border-border">
              <h3 className="font-semibold text-sm mb-3">Background Image</h3>
              <ImageUploader
                onImageSelect={setBackgroundImage}
              />
            </Card>

            {/* Logo Upload */}
            <Card className="p-4 border-border">
              <h3 className="font-semibold text-sm mb-3">Company Logo</h3>
              <ImageUploader
                onImageSelect={setLogoUrl}
              />
            </Card>

            {/* Save & Export */}
            <div className="space-y-2">
              <Button
                onClick={() => setShowSaveDialog(true)}
                disabled={shapes.length === 0}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>

              <Button
                onClick={handleExportPNG}
                disabled={shapes.length === 0}
                variant="outline"
                className="w-full bg-transparent"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PNG
              </Button>
            </div>

            {/* Saved Templates */}
            <Card className="p-4 border-border">
              <h3 className="font-semibold text-sm mb-4">Your Templates</h3>
              <TemplateManagerV2
                onSelectTemplate={handleApplyTemplate}
              />
            </Card>
          </div>

          {/* Canvas Area */}
          <div className="lg:col-span-2">
            <Card className="p-6 border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4">Preview</h2>
              <div className="bg-white rounded-lg overflow-auto">
                <TemplateCanvas
                  shapes={shapes}
                  backgroundImage={backgroundImage}
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                  campaignData={campaignData}
                  logoUrl={logoUrl}
                  selectedShapeId={selectedShapeId}
                  onShapeSelect={setSelectedShapeId}
                  onShapeDrag={handleShapeDrag}
                  onShapeResize={handleShapeResize}
                  isEditable={true}
                />
              </div>

              {shapes.length === 0 && (
                <div className="mt-6 p-8 text-center border-2 border-dashed border-border rounded-lg">
                  <Plus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-3">No shapes added yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Go to the Template tab on the left and add shapes to start designing
                  </p>
                  <Button
                    onClick={() => handleAddShape('text')}
                    variant="outline"
                    size="sm"
                  >
                    Add First Shape
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Save Template Dialog */}
      <SaveTemplateDialogV2
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        shapes={shapes}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        backgroundImage={backgroundImage}
        onSave={() => {
          setShowSaveDialog(false)
        }}
      />
    </main>
  )
}
