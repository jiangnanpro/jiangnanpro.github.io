$(document).ready(function() {
    $('a.abstract').click(function() {
        $(this).parent().parent().find(".abstract.hidden").toggleClass('open');
    });
    $('.publication-citation').click(function() {
        var citation = $(this).closest('.row').find('.bibtex.hidden');
        citation.toggleClass('open');
        $(this).attr('aria-expanded', citation.hasClass('open'));
    });
    $('a').removeClass('waves-effect waves-light');
});
