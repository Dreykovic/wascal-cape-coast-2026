<?php

namespace Tests\Feature;

use Tests\TestCase;

class SeoTest extends TestCase
{
    public function test_home_has_canonical_and_no_placeholder(): void
    {
        config(['app.url' => 'https://exemple.test']);
        $html = $this->get('/')->assertOk()->getContent();

        $this->assertStringContainsString('<link rel="canonical" href="https://exemple.test/" />', $html);
        $this->assertStringNotContainsString('%SITE_URL%', $html);
    }

    public function test_robots_and_sitemap(): void
    {
        config(['app.url' => 'https://exemple.test']);

        $this->get('/robots.txt')->assertOk()->assertSee('Sitemap: https://exemple.test/sitemap.xml');
        $this->get('/sitemap.xml')->assertOk()->assertSee('<loc>https://exemple.test/</loc>', false);
    }

    public function test_tool_pages_are_noindex(): void
    {
        $this->assertStringContainsString('noindex', $this->get('/survey')->streamedContent());
        $this->assertStringContainsString('noindex', $this->get('/admin')->streamedContent());
    }
}
