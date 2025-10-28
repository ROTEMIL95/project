$files = Get-ChildItem -Path "Frontend/src" -Recurse -Include "*.jsx","*.js"
foreach ($file in $files) {
    (Get-Content $file.FullName) | ForEach-Object {
        $_ -replace "from '@/api/entities'", "from '@/lib/entities'" `
           -replace 'from "@/api/entities"', 'from "@/lib/entities"' `
           -replace "from '@/api/integrations'", "from '@/lib/integrations'" `
           -replace 'from "@/api/integrations"', 'from "@/lib/integrations"'
    } | Set-Content $file.FullName
}