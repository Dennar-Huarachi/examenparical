<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RecuperacionPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public $usuario;
    public $link;

    public function __construct($usuario, $link)
    {
        $this->usuario = $usuario;
        $this->link = $link;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Recuperación de contraseña - Sistema CUP',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.recuperacion_password',
        );
    }
}
