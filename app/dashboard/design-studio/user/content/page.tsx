'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CampaignDataForm from '@/components/campaign-data-form'
import TemplateManagerV2 from '@/components/template-manager-v2'
import { Template, CampaignData } from '@/lib/types'
import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DEFAULT_CAMPAIGN_DATA } from '@/lib/campaign-context'

export default function ContentUploadPage() {
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [campaignData, setCampaignData] = useState<CampaignData>(DEFAULT_CAMPAIGN_DATA)

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template)
  }

  const handleProceedToGenerate = () => {
    if (selectedTemplate) {
      const state = {
        template: selectedTemplate,
        campaignData
      }
      sessionStorage.setItem('campaignState', JSON.stringify(state))
      router.push('/dashboard/design-studio/user/generate')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
            Create Campaign
          </h1>
          <p className="text-muted-foreground">
            Select a template and fill in your campaign content
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Left: Template Selection */}
          <div className="col-span-1">
            <Card className="p-6 border-border sticky top-24">
              <h2 className="font-semibold text-foreground mb-4">Select Template</h2>
              <TemplateManagerV2
                onSelectTemplate={handleSelectTemplate}
                onEditTemplate={() => {}}
              />

              {selectedTemplate && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground">Selected</p>
                    <p className="font-medium text-foreground">{selectedTemplate.name}</p>
                    {selectedTemplate.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedTemplate.description}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleProceedToGenerate}
                    disabled={!selectedTemplate}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    Proceed to Generate
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Right: Content Form */}
          <div className="col-span-2">
            <div className="space-y-4">
              <Card className="p-6 border-border">
                <CampaignDataForm
                  data={campaignData}
                  onChange={setCampaignData}
                />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
