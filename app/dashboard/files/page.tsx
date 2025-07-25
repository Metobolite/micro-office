"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Search, Filter, FileText, ImageIcon, File, Download, MoreHorizontal, Grid, List } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface FileItem {
  id: string
  name: string
  type: "pdf" | "image" | "document" | "video" | "other"
  size: string
  modified: string
  owner: {
    name: string
    avatar: string
  }
  category: string
}

const files: FileItem[] = [
  {
    id: "1",
    name: "Project Proposal.pdf",
    type: "pdf",
    size: "2.4 MB",
    modified: "2 saat önce",
    owner: { name: "John Doe", avatar: "/placeholder.svg?height=32&width=32" },
    category: "Dökümanlar",
  },
  {
    id: "2",
    name: "UI Mockups.fig",
    type: "other",
    size: "15.8 MB",
    modified: "4 saat önce",
    owner: { name: "Jane Smith", avatar: "/placeholder.svg?height=32&width=32" },
    category: "Tasarım",
  },
  {
    id: "3",
    name: "Team Photo.jpg",
    type: "image",
    size: "3.2 MB",
    modified: "1 gün önce",
    owner: { name: "Mike Johnson", avatar: "/placeholder.svg?height=32&width=32" },
    category: "Görseller",
  },
  {
    id: "4",
    name: "Database Schema.sql",
    type: "document",
    size: "156 KB",
    modified: "2 gün önce",
    owner: { name: "Sarah Wilson", avatar: "/placeholder.svg?height=32&width=32" },
    category: "Kod",
  },
  {
    id: "5",
    name: "Demo Video.mp4",
    type: "video",
    size: "45.2 MB",
    modified: "3 gün önce",
    owner: { name: "John Doe", avatar: "/placeholder.svg?height=32&width=32" },
    category: "Video",
  },
  {
    id: "6",
    name: "Meeting Notes.docx",
    type: "document",
    size: "234 KB",
    modified: "1 hafta önce",
    owner: { name: "Jane Smith", avatar: "/placeholder.svg?height=32&width=32" },
    category: "Dökümanlar",
  },
]

const getFileIcon = (type: string) => {
  switch (type) {
    case "pdf":
    case "document":
      return FileText
    case "image":
      return ImageIcon
    default:
      return File
  }
}

const categories = ["Tümü", "Dökümanlar", "Görseller", "Tasarım", "Video", "Kod"]

export default function FilesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Tümü")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "Tümü" || file.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-xl font-semibold">Dosyalar</h1>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Dosya Yükle
          </Button>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Dosya ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  {selectedCategory}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {categories.map((category) => (
                  <DropdownMenuItem key={category} onClick={() => setSelectedCategory(category)}>
                    {category}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
              {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Files Grid/List */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => {
              const Icon = getFileIcon(file.type)
              return (
                <Card key={file.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Icon className="h-8 w-8 text-muted-foreground" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            İndir
                          </DropdownMenuItem>
                          <DropdownMenuItem>Paylaş</DropdownMenuItem>
                          <DropdownMenuItem>Sil</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="font-medium text-sm mb-2 truncate">{file.name}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{file.size}</span>
                        <Badge variant="outline" className="text-xs">
                          {file.category}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={file.owner.avatar || "/placeholder.svg"} />
                          <AvatarFallback className="text-xs">
                            {file.owner.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{file.modified}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredFiles.map((file) => {
                  const Icon = getFileIcon(file.type)
                  return (
                    <div key={file.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">{file.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{file.size}</span>
                            <span>{file.modified}</span>
                            <div className="flex items-center space-x-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={file.owner.avatar || "/placeholder.svg"} />
                                <AvatarFallback className="text-xs">
                                  {file.owner.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span>{file.owner.name}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{file.category}</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              İndir
                            </DropdownMenuItem>
                            <DropdownMenuItem>Paylaş</DropdownMenuItem>
                            <DropdownMenuItem>Sil</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
