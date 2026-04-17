'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ImageUploader from '@/components/image-uploader'
import { DEFAULT_CAMPAIGN_DATA } from '@/lib/campaign-context'

export default function GenerateImage({ campaignInfo}:{ campaignInfo: any }) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
   const [campaignData, setCampaignData] = useState(DEFAULT_CAMPAIGN_DATA)
  const [generatedBanner, setGeneratedBanner] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [templateId] = useState('y1vwRJZeql3jZKNjxg')  // Your Bannerbear template ID

  useEffect(() => {
    // Initialize campaign data with default values
    setCampaignData({
      hook: campaignInfo.hook || '',
      subheading: campaignInfo.subheading || '',
      bullets: campaignInfo.bullets || ['', '', ''],
      proof: campaignInfo.proof || '',
      cta: campaignInfo.cta || '',
      companyName: campaignInfo.companyName || '',
      location: campaignInfo.location || '',
      hashtags: campaignInfo.hashtags || '',
    })
  }, [campaignInfo])

    const handleImageUpload = (imageUrl: string) => {
    setUploadedImage(imageUrl)
  }

  const handleFieldChange = (field: string, value: string | string[]) => {
    setCampaignData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleBulletChange = (index: number, value: string) => {
    const newBullets = [...campaignData.bullets]
    newBullets[index] = value
    setCampaignData(prev => ({
      ...prev,
      bullets: newBullets
    }))
  }

  const handleGenerateBanner = async () => {
    if (!uploadedImage) {
      alert('Please upload an image first')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/generate-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backgroundImage: uploadedImage,
          campaignData,
          templateId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to generate banner')
      }

      const data = await response.json()
      console.log('[v0] Banner generated:', data)
      
      // If render status is processing, poll for the result
      if (data.renderStatus === 'processing') {
        setTimeout(() => {
          fetch(`/api/banner-status/${data.imageId}`)
            .then(res => res.json())
            .then(result => {
              if (result.image_url) {
                setGeneratedBanner(result.image_url)
              }
            })
        }, 2000)
      } else {
        setGeneratedBanner(data.imageUrl)
      }
    } catch (error) {
      console.error('Error generating banner:', error)
      alert(`Failed to generate banner: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-2 text-balance">
            Campaign Banner Generator
          </h1>
          <p className="text-lg text-muted-foreground">
            Create stunning marketing banners by uploading an image and customizing your campaign text
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            {/* Image Upload */}
            <Card className="p-6 border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">1. Upload Background Image</h2>
              <ImageUploader onImageUpload={handleImageUpload} currentImage={uploadedImage} />
            </Card>

            {/* Campaign Form */}
            <Card className="p-6 border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">2. Campaign Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Hook / Headline</label>
                  <Input
                    value={campaignData.hook}
                    onChange={(e) => handleFieldChange('hook', e.target.value)}
                    placeholder="Main headline for your campaign"
                    className="bg-secondary text-foreground border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Subheading</label>
                  <Input
                    value={campaignData.subheading}
                    onChange={(e) => handleFieldChange('subheading', e.target.value)}
                    placeholder="Secondary heading"
                    className="bg-secondary text-foreground border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Bullet Points</label>
                  <div className="space-y-2">
                    {campaignData.bullets.map((bullet, index) => (
                      <Input
                        key={index}
                        value={bullet}
                        onChange={(e) => handleBulletChange(index, e.target.value)}
                        placeholder={`Bullet point ${index + 1}`}
                        className="bg-secondary text-foreground border-border text-sm"
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Proof / Statistic</label>
                  <Input
                    value={campaignData.proof}
                    onChange={(e) => handleFieldChange('proof', e.target.value)}
                    placeholder="Supporting statistic or proof"
                    className="bg-secondary text-foreground border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Call to Action</label>
                  <Input
                    value={campaignData.cta}
                    onChange={(e) => handleFieldChange('cta', e.target.value)}
                    placeholder="Your CTA text"
                    className="bg-secondary text-foreground border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Company / Brand Name</label>
                  <Input
                    value={campaignData.companyName}
                    onChange={(e) => handleFieldChange('companyName', e.target.value)}
                    placeholder="Your company name"
                    className="bg-secondary text-foreground border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                  <Input
                    value={campaignData.location}
                    onChange={(e) => handleFieldChange('location', e.target.value)}
                    placeholder="Location"
                    className="bg-secondary text-foreground border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Hashtags</label>
                  <Textarea
                    value={campaignData.hashtags}
                    onChange={(e) => handleFieldChange('hashtags', e.target.value)}
                    placeholder="Your hashtags"
                    className="bg-secondary text-foreground border-border"
                    rows={2}
                  />
                </div>
              </div>
            </Card>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateBanner}
              disabled={!uploadedImage || isLoading}
              className="w-full h-12 text-lg font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isLoading ? 'Generating Banner...' : 'Generate Banner'}
            </Button>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <Card className="p-6 border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">3. Preview</h2>
              
              {generatedBanner ? (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden bg-secondary">
                    <img 
                      src={generatedBanner || "/placeholder.svg"} 
                      alt="Generated banner" 
                      className="w-full h-auto"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = generatedBanner
                      link.download = 'campaign-banner.png'
                      link.click()
                    }}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    Download Banner
                  </Button>
                </div>
              ) : (
                <div className="w-full h-96 bg-secondary rounded-lg flex items-center justify-center border border-dashed border-border">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-2">Upload an image and customize your campaign</p>
                    <p className="text-sm text-muted-foreground">Click "Generate Banner" to create your artwork</p>
                  </div>
                </div>
              )}
            </Card>

            {uploadedImage && (
              <Card className="p-6 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Uploaded Image Preview</h3>
                <div className="rounded-lg overflow-hidden bg-secondary">
                  <img src={uploadedImage || "/placeholder.svg"} alt="Uploaded" className="w-full h-auto max-h-64 object-cover" />
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
