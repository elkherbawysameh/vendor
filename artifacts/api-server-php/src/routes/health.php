<?php

route('GET', '/healthz', function () {
    json_response(['status' => 'ok']);
});
