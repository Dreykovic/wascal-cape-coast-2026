<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PageController extends Controller
{
    // Pages publiques : on y injecte l'URL absolue du site (canonical, og:url, og:image, JSON-LD).
    public function index(): Response  { return $this->render('index'); }
    public function survey(): Response { return $this->render('survey'); }

    public function admin(): BinaryFileResponse
    {
        return $this->page('admin');
    }

    // /survey et /admin restent crawlables pour que Google voie leur <meta robots noindex> ;
    // les bloquer ici l'empêcherait de le lire.
    public function robots(): Response
    {
        $base = rtrim(config('app.url'), '/');
        $body = "User-agent: *\nDisallow: /api/\n\nSitemap: {$base}/sitemap.xml\n";

        return response($body)->header('Content-Type', 'text/plain; charset=UTF-8');
    }

    public function sitemap(): Response
    {
        $base = rtrim(config('app.url'), '/');
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n"
            . "  <url><loc>{$base}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n"
            . '</urlset>' . "\n";

        return response($xml)->header('Content-Type', 'application/xml; charset=UTF-8');
    }

    protected function render(string $name): Response
    {
        $html = file_get_contents(resource_path("pages/{$name}.html"));
        $html = str_replace('%SITE_URL%', rtrim(config('app.url'), '/'), $html);

        return response($html)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    // Sert une page HTML statique de resources/pages (front vanilla, aucun build, aucun parsing Blade).
    protected function page(string $name): BinaryFileResponse
    {
        return response()->file(resource_path("pages/{$name}.html"));
    }
}
