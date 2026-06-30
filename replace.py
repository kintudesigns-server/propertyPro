import re

with open('c:/PropertyPro/src/app/dashboard/owner/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add PropertyForm import
import_stmt = 'import { PropertyForm } from "@/components/PropertyForm";\n'
if import_stmt not in content:
    content = content.replace('import { Card } from "@/components/ui/card";', import_stmt + 'import { Card } from "@/components/ui/card";')

# 2. Replace handleSaveProperty
old_handle_save = r"""  const handleSaveProperty = async \(e: React.FormEvent\) => \{
    e\.preventDefault\(\);
    if \(!pName \|\| !pAddr \|\| !pCity \|\| !pCountry\) \{
      toast\.error\("Please fill in all required property details\."\);
      return;
    \}

    try \{
      const method = editPropId \? "PUT" : "POST";
      const bodyPayload = \{
        name: pType \+ ":" \+ pName,
        address: pAddr,
        city: pCity,
        country: pCountry,
        coverPhoto: pCover \|\| null,
        \.\.\.\(editPropId \? \{ id: editPropId \} : \{\}\),
      \};

      const res = await fetch\("/api/properties", \{
        method,
        headers: \{ "Content-Type": "application/json" \},
        body: JSON\.stringify\(bodyPayload\),
      \}\);

      if \(res\.ok\) \{
        toast\.success\(editPropId \? "Property updated successfully!" : "Property created successfully!"\);
        setPropOpen\(false\);
        setPName\(""\);
        setPAddr\(""\);
        setPCity\(""\);
        setPCountry\(""\);
        setPCover\(""\);
        setPType\("Apartment"\);
        setEditPropId\(null\);
        fetchOwnerData\(\);
        setActiveTab\("properties"\);
      \} else \{
        const err = await res\.json\(\);
        toast\.error\(err\.error \|\| `Failed to \$\{editPropId \? "update" : "add"\} property`\);
      \}
    \} catch \(err\) \{
      toast\.error\(`Property \$\{editPropId \? "update" : "creation"\} error`\);
    \}
  \};"""

new_handle_save = """  const handleSaveProperty = async (data: any) => {
    try {
      const method = data.id ? "PUT" : "POST";
      const res = await fetch("/api/properties", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success(data.id ? "Property updated successfully!" : "Property created successfully!");
        setEditPropId(null);
        fetchOwnerData();
        setActiveTab("properties");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save property");
      }
    } catch (err) {
      toast.error("Property save error");
    }
  };"""

content = re.sub(old_handle_save, new_handle_save, content)

# 3. Replace Add Property Tab Content
tab_pattern = re.compile(r'(<TabsContent value="add-property" className="outline-none">).*?(?={/\* Available Units Tab \*/})', re.DOTALL)
new_tab = """<TabsContent value="add-property" className="outline-none">
            <PropertyForm 
              onSave={handleSaveProperty} 
              onCancel={() => { setActiveTab('properties'); setEditPropId(null); }} 
              initialData={editPropId ? properties.find((p: any) => p.id === editPropId) : undefined} 
            />
          </TabsContent>
          
          """

if tab_pattern.search(content):
    content = tab_pattern.sub(new_tab, content)

# 4. Simplify Edit Property button
# We need to change the onClick for the pencil button in the Property grid (line ~1440).
# The old one sets pName, pType, etc. We just need to set editPropId and activeTab.
edit_btn_pattern = re.compile(r"onClick=\{\(\) => \{ setEditPropId\(p\.id\); setPName\(getPropName\(p\)\); setPType\(getPropType\(p\)\); setPAddr\(p\.address\); setPCity\(p\.city\); setPCountry\(p\.country\); setPCover\(p\.coverPhoto \|\| ''\); setActiveTab\('add-property'\); \}\}")
new_edit_btn = "onClick={() => { setEditPropId(p.id); setActiveTab('add-property'); }}"
content = re.sub(edit_btn_pattern, new_edit_btn, content)

with open('c:/PropertyPro/src/app/dashboard/owner/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced successfully")
