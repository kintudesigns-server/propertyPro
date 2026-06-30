import re

with open('c:/PropertyPro/src/components/PropertyForm.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import for UploadCloud and toast
if 'UploadCloud' not in content:
    content = content.replace('import { Folder, MapPin, Building2, Star, Image as ImageIcon, Plus, Trash2, CheckCircle, X } from "lucide-react";',
                              'import { Folder, MapPin, Building2, Star, Image as ImageIcon, Plus, Trash2, CheckCircle, X, UploadCloud } from "lucide-react";')
if 'import { toast } from "sonner";' not in content:
    content = content.replace('import { Card } from "@/components/ui/card";', 'import { toast } from "sonner";\nimport { Card } from "@/components/ui/card";')

# Define PREDEFINED_AMENITIES and helper functions
constants_and_helpers = """const PREDEFINED_AMENITIES = [
  "Parking", "In-unit laundry", "Air conditioning", "Central heating",
  "High-speed Wi-Fi", "Furnished", "Hardwood Floors", "Dishwasher",
  "Balcony / Terrace", "Walk-in Closets", "Pet-friendly", "Swimming pool",
  "Fitness Center", "Elevator", "Storage", "Fireplace"
];"""

if 'const PREDEFINED_AMENITIES' not in content:
    content = content.replace('export function PropertyForm({ initialData, onSave, onCancel }: PropertyFormProps) {',
                              constants_and_helpers + '\n\nexport function PropertyForm({ initialData, onSave, onCancel }: PropertyFormProps) {')

# Add handleFileUpload function
file_upload_fn = """  const [isUploading, setIsUploading] = useState(false);

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => {
      if (prev.amenities.includes(amenity)) {
        return { ...prev, amenities: prev.amenities.filter((a) => a !== amenity) };
      } else {
        return { ...prev, amenities: [...prev.amenities, amenity] };
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    try {
      const files = Array.from(e.target.files);
      const newUrls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          newUrls.push(data.url);
        } else {
          toast.error("Failed to upload an image.");
        }
      }
      if (newUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...newUrls],
          coverPhoto: prev.coverPhoto ? prev.coverPhoto : newUrls[0]
        }));
      }
    } catch (err) {
      toast.error("Upload error occurred.");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };"""

if 'const handleFileUpload' not in content:
    content = content.replace('const [newImage, setNewImage] = useState("");',
                              'const [newImage, setNewImage] = useState("");\n\n' + file_upload_fn)

# Replace the amenities & media block
pattern = re.compile(r'\{/\* Amenities & Media \(Grid\) \*/\}.*?(?=    </form>)', re.DOTALL)

new_ui = """{/* Amenities & Media (Vertical Layout like SS) */}
      <Card className="bg-white border border-slate-100 rounded-[28px] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><Star className="h-5 w-5" /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Amenities & Features</h3>
            <p className="text-sm text-slate-500 mt-0.5">Select the core amenities and features that best describe this property.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {PREDEFINED_AMENITIES.map((amenity) => {
            const selected = formData.amenities.includes(amenity);
            return (
              <button
                type="button"
                key={amenity}
                onClick={() => toggleAmenity(amenity)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-sm font-medium ${selected ? "border-blue-600 bg-blue-50/50 text-blue-900" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
              >
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${selected ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"}`}>
                  {selected && <CheckCircle className="h-2.5 w-2.5 text-white" />}
                </div>
                {amenity}
              </button>
            );
          })}
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <Label className="text-xs font-bold text-slate-700 uppercase mb-2 block">Add custom amenity or feature</Label>
          <div className="flex gap-2">
            <Input value={newAmenity} onChange={(e) => setNewAmenity(e.target.value)} placeholder="e.g., Rooftop terrace, Smart home" className="bg-white border-slate-200 rounded-xl h-11 max-w-sm" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAmenity())} />
            <Button type="button" variant="outline" onClick={handleAddAmenity} className="border-slate-200 text-slate-600 hover:bg-white rounded-xl h-11 px-4">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {formData.amenities.filter(a => !PREDEFINED_AMENITIES.includes(a)).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200">
              {formData.amenities.filter(a => !PREDEFINED_AMENITIES.includes(a)).map((amenity, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm">
                  {amenity}
                  <button type="button" onClick={() => handleRemoveAmenity(amenity)} className="text-slate-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-white border border-slate-100 rounded-[28px] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="bg-green-50 text-green-500 p-2.5 rounded-xl"><ImageIcon className="h-5 w-5" /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Property Images</h3>
            <p className="text-sm text-slate-500 mt-0.5">Upload high-quality images to showcase your property.</p>
          </div>
        </div>
        
        <div className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-3xl p-12 text-center relative hover:bg-blue-50/50 transition-colors">
          <input
            type="file"
            multiple
            accept="image/png, image/jpeg, image/gif"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <div className="bg-blue-100 text-blue-600 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-900 mb-1">Upload property images</h4>
          <p className="text-sm text-slate-500 mb-4">Drag and drop your images here, or click to browse files</p>
          <div className="flex items-center justify-center gap-4 text-xs font-bold text-green-600 mb-6">
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> PNG, JPG, GIF</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Up to 10MB each</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> {formData.images.length}/20 uploaded</span>
          </div>
          <Button type="button" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-white rounded-xl h-11 px-6 font-bold" disabled={isUploading}>
            <ImageIcon className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Choose Files"}
          </Button>
        </div>

        {formData.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-8">
            {formData.images.map((img, i) => (
              <div key={i} className="aspect-square bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative group shadow-sm">
                <img src={img} alt="Property" className="w-full h-full object-cover" onError={(e: any) => (e.currentTarget.src = "")} />
                <button type="button" onClick={() => handleRemoveImage(img)} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
"""

content = pattern.sub(new_ui, content)

with open('c:/PropertyPro/src/components/PropertyForm.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("UI successfully updated")
