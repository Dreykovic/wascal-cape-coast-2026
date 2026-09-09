<?php

namespace App\Http\Controllers;

use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PageController extends Controller
{
    public function index(): BinaryFileResponse  { return $this->page('index'); }
    public function survey(): BinaryFileResponse { return $this->page('survey'); }
    public function admin(): BinaryFileResponse  { return $this->page('admin'); }

    // Sert une page HTML statique de resources/pages (front vanilla, aucun build, aucun parsing Blade).
    protected function page(string $name): BinaryFileResponse
    {
        return response()->file(resource_path("pages/{$name}.html"));
    }
}
