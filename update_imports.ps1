$files = Get-ChildItem -Path "Frontend\src" -Recurse -Include "*.jsx", "*.js"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace '@/api/entities', '@/lib/entities'
    $newContent = $newContent -replace '@/api/integrations', '@/lib/integrations'
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "Updated $($file.FullName)"
    }
}
