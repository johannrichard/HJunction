/*
Namespace: TrimPath.junctionHelpers
  Standard View helper functions to help generate HTML output.

Source:
  trimpath/junctionHelpers.js

Release:
  See trimpath/junction.js

Copyright:
  copyright (c) 2005, 2006, 2007 Steve Yen, TrimPath.

License:
  dual licensed GNU General Public License 2.0 and 
                Apache Public License 2.0
*/
if (typeof(TrimPath) == 'undefined')
    TrimPath = {};

(function() {
    var junctionUtil = TrimPath.junctionUtil;

    /*
    Section: Creation
    */

    /*
    Function: TrimPath.junctionHelpers (res)
      Fills and returns a hash/map object of standard View helper functions.

    Example:
    > var helpers = TrimPath.junctionHelpers();
    > var str = helpers.linkToLocal(...);

    Parameters:
    - res - An optional response (or res) hash/map object, to which 
            the View helper functions will be added.  
            If null or undefined, the TrimPath.junctionHelpers() 
            function will return a new hash/map object.

    Returns:
      The res object parameter, or a new hash/map object if res is null.
    */
    TrimPath.junctionHelpers = function(res) {
        res = res || {};
        for (var i = 0; i < TrimPath.junctionHelperMakers.length; i++) {
            var helpers = TrimPath.junctionHelperMakers[i](res);
            for (var k in helpers)
                res[k] = helpers[k];
        }        
        return res;
    }

    var helperMaker = function(res) {
        var urlForArgsPrep = function(controllerNameIn, actionNameIn, objIdIn, args) {
            if (res != null &&
                res.urlForArgsPrep != null)
                return res.urlForArgsPrep(controllerNameIn, actionNameIn, objIdIn, args);

            return junctionUtil.urlForArgsPrep(controllerNameIn, actionNameIn, objIdIn, args);
        }

        var helpers = junctionUtil.addCamelCaseAliases({
            /*
            Section: Include Tags
            */

            /*
            Function: javascriptIncludeTag (scriptName)
              Returns a <script> link or inline <script> tag,
              depending on the runtime environment.
        
              When used in a server-side runtime environment,
              this function returns a <script src="..."></script>
              (script link) result.
        
              When used in a client-side runtime environment,
              this function returns a <script>...js content...</script>
              (script inline) result.  This client-side optimization
              is because the Junction client-side system has the full
              JavaScript content text already cached in memory.  This
              client-side caching happens for all *.js files in the
              public/javascripts directory.
        
              In either case, the effect is the same whether client-side
              or server-side, as the script is loaded and executed in 
              the browser.
        
            Example:
            > <html>
            > <head>
            > <%= javascriptIncludeTag('jquery') %>
            > <%= javascriptIncludeTag('lightbox') %>
            > </head>
        
            Parameters:
            - scriptName - A string of the base filename under the '/code/public/javascripts/' directory.
                           A '.js' suffix is automatically appended to the scriptName.
        
            Returns:
              A string HTML <script> fragment.
            */
            //
            javascript_include_tag : function(scriptName) {
                return TrimPath.junction.env.javascriptIncludeTag(scriptName);
            },
        
            /*
            Function: stylesheetIncludeTag (stylesheetName)
              Returns a stylesheet <style> or <link> tag,
              depending on the runtime environment.
        
              When used in a server-side runtime environment,
              this function returns a <link rel="..."/>
              (stylesheet link) result.
        
              When used in a client-side runtime environment,
              this function returns a <style>...css content...</style>
              (stylesheet inline) result.  This client-side optimization
              is because the Junction client-side system has the full
              CSS content text already cached in memory.  This
              client-side caching happens for all *.css files in the
              public/stylesheets directory.                      
        
            Example:
            > <html>
            > <head>
            > <%= stylesheetIncludeTag('application') %>
            > <%= stylesheetIncludeTag('iui') %>
            > </head>
        
            Parameters:
            - stylesheetName - A string of the base filename under the '/code/public/stylesheets/' directory.
                               A '.css' suffix is automatically appended to the stylesheetName.
        
            Returns:
              A string HTML <style> or <link> fragment.
            */
            //
            stylesheet_include_tag : function(stylesheetName) {
                return TrimPath.junction.env.stylesheetIncludeTag(stylesheetName);
            },
        
            /*
            Function: include (textPath)
              Returns the text content of a static code file.
        
              The file must live under the code directory.
        
              When used in a client-side runtime environment,
              only those files that the Junction client system
              has cached are available to the include() method.
        
              These cached files include /app/**.js|.jst|.est files,
              /public/javascripts/**.js files, and
              /public/stylesheet/**.css files.
        
            Example:
            > <style>
            > <%= include('/public/stylesheets/application.css') %>
            > </style>
        
            Parameters:
            - textPath - A string of full relative path of a static code file.
                         A leading '/' character is usually required.
        
            Returns:
              A string HTML <style> or <link> fragment.
            */
            include : function(textPath) {
                return TrimPath.junction.env.textRead(textPath) || 
                       ("[ERROR: cannot include unknown file: " + textPath + "]");
            },

            ///////////////////////////////////////////////////////        
            /*
            Section: Link Tags
            */

            /*
            Function: urlForArgs (args)
              Returns a URL string from the given args hash/map.
        
              If the args hash/map has a 'url' key, then
              that is returned.  Otherwise, the key/value 
              pairs from the args hash/map are returned in
              ?key1=val1&key2=val2... format, as implemented
              by <junctionUtil.toUrlParams>.
        
            See: <junctionUtil.toUrlParams>
        
            Example:
            > <a href="<%= urlForArgs({ controllerName: 'invoice',
            >                           actionName: 'recordPayment',
            >                           objId: invoice.id,
            >                           priority: 'high' }) %>
            >    Record Invoice Payment</a>
            >
            > <a href="<%= urlForArgs({ url: 'http://helma.org',
            >                           param1: 'this param is ignored',
            >                           param2: 'another ignored param',
            >                           param3: 'because the url key is used' }) %>
            >    Helma Object Publisher</a>
        
            Parameters:
            - args - A hash/map object.
        
            Returns:
              A string URL.
            */
            //
            url_for_args : function(args) {
                // Construct a url from the args map.
                //
                if (args.url != null)
                    return args.url;
        
                return '?' + junctionUtil.toUrlParams(args);
            },
       
            /*
            Function: urlFor (...)
              Returns a URL string.
        
            Multiple call signatures:
              The urlFor method has two call signatures...
              - urlFor(controllerName, actionName, objId, args)
              - urlFor(args)
        
            Example:
            > res.urlFor('order', 'show', 123, { withTax : 1 });
            > res.urlFor({ controllerName : 'order', // optional, defaults to current request's controllerName.
            >              actionName     : 'show',  // optional, defaults to current request's actionName.
            >              objId          : 123,     // optional, defaults to current request's objId.
            >              withTax : 1 });
            >
            > // Both calls above return...
            > // ?controllerName=order&actionName=show&objId=123&withTax=1
            >
            > <a href="<%= urlFor('order', 'show', order.id) %>">Show Order</a>
            > // becomes...
            > <a href="?controllerName=order&actionName=show&objId=123&withTax=1">Show Order</a>
        
            Parameters:
            - controllerName - A string name of a Controller.
            - actionName - A string name of a action method.
            - objId - A id string or number for a target object for the action to act on.
            - args - A hash/map object.
        
            Returns:
              A string URL.
            */
            //
            url_for : function(controllerName, actionName, objId, args) {
                return (res || helpers).urlForArgs(urlForArgsPrep(controllerName, actionName, objId, args));
            },
        
            html_options_prepare_confirm : function(htmlOptions) {
                if (htmlOptions != null &&
                    htmlOptions.confirm != null) {
                    if (htmlOptions.confirm == true)
                        htmlOptions.confirm = "Are you sure?";
                    htmlOptions.onclick = "if (!confirm('" + htmlOptions.confirm + "')) return false;" + (htmlOptions.onclick || "");
                    delete htmlOptions.confirm;
                    if (htmlOptions['class'] == null ||
                        htmlOptions['class'].length <= 0)
                        htmlOptions['class'] = 'confirm';
                    else
                        htmlOptions['class'] = htmlOptions['class'] + ' confirm';
                }
            },
        
            /*
            Function: linkToArgs (linkText, args, htmlOptions)
              Returns an <A> link tag string.
        
            Example:
            > <%= linkToArgs('Show Order', { 
            >                controllerName : 'order',
            >                actionName     : 'show',
            >                objId          : order.id,
            >                withTax : 1 });
            > // becomes...
            > <a href="?controllerName=order&actionName=show&objId=123&withTax=1">Show Order</a>
        
            Parameters:
            - linkText - A string that becomes the content of the <A></A> links.
            - args - A hash/map object passed to urlForArgs().
            - htmlOptions - An optional hash/map object, containing extra
                            HTML attributes and values for the <A> tag.
        
            Confirm:
              In the htmlOptions, a special key of confirm:true or
              confirm:'confirmation message text' signals the linkToArgs
              method to append an onclick event handler that calls
              the JavaScript confirm() popup box.  It is useful
              for delete commands and actions.
        
            Example:
            > <%= linkToArgs('Delete Order', {...}, { confirm: true }) %>
            > <%= linkToArgs('Delete Order', {...}, { confirm: 'Are you really sure?' }) %>
        
            CSS Class:
              In the htmlOptions, because class is a JavaScript
              reserved word, use a string key of 'class' to set the CSS class.
        
            Example:
            > <%= linkToArgs('Home Page', {...}, { 'class': 'hoverable bigText' }) %> // RIGHT
            > <%= linkToArgs('Home Page', {...}, { class: 'hoverable bigText' }) %> // WRONG
        
            Returns:
              A string of an HTML <a> link.
            */
            //
            link_to_args : function(linkText, args, htmlOptions) {
                (res || helpers).htmlOptionsPrepareConfirm(htmlOptions);
                var result = [ '<a href="', (res || helpers).urlForArgs(args), '"' ];
                junctionUtil.pushAttributes(result, htmlOptions);
                result.push('>');
                result.push(linkText);
                result.push('</a>');
                return result.join('');
            },
        
            /*
            Function: linkTo (...)
              Returns a HTML <A> link string to the given controller/action.
        
            Multiple call signatures:
              The linkTo method supports two call signatures...
              - linkTo(linkText, controllerName, actionName, objId (optional), htmlOptions (optional))
              - linkTo(linkText, args, htmlOptions (optional))
        
              The args is a hash or map object that holds request parameters.
        
            Example:
            > <%= linkTo('Home', 'home', 'index', null, { 'class':'red' }) %>
            > <%= linkTo('Home', { controllerName : 'home',
            >                      actionName     : 'index' }, 
            >                    { 'class':'red' }) %>
        
            Parameters:
            - linkText - A string that becomes the content of the <A></A> links.
            - controllerName - A string name of a Controller. 
                               If null, defaults to the name of the Controller of the current request.
            - actionName - A string name of an action method. 
                           If null, defaults to the action method name of the current request.
            - objId - A string or number of a target object for the action to focus on.
            - args - A hash/map object passed to urlForArgs().
            - htmlOptions - An optional hash/map object, containing extra
                            HTML attributes and values for the <A> tag.
        
            Confirm:
              In the htmlOptions, a special key of confirm:true or
              confirm:'confirmation message text' signals the linkToArgs
              method to append an onclick event handler that calls
              the JavaScript confirm() popup box.  It is useful
              for delete commands and actions.
        
            Example:
            > <%= linkTo('Delete Order', {...}, { confirm: true }) %>
            > <%= linkTo('Delete Order', {...}, { confirm: 'Are you really sure?' }) %>
        
            CSS Class:
              In the htmlOptions, because class is a JavaScript
              reserved word, use a string key of 'class' to set the CSS class.
        
            Example:
            > <%= linkTo('Home Page', {...}, { 'class': 'hoverable bigText' }) %> // RIGHT
            > <%= linkTo('Home Page', {...}, { class: 'hoverable bigText' }) %> // WRONG
        
            Returns:
              A string of an HTML <a> link.
            */
            //
            link_to : function(linkText, controllerName, actionName, objId, htmlOptions) {
                if (typeof(controllerName) == 'object') // Called with 2nd signature.
                    return (res || helpers).linkToArgs(linkText, urlForArgsPrep(controllerName), actionName);
        
                return (res || helpers).linkToArgs(linkText, urlForArgsPrep(controllerName, actionName, objId), htmlOptions);
            },
        
            /*
            Function: linkToLocal (...)
              Returns a HTML <A> link to the given controller/action, with
              an onclick event handler that calls the client-side Junction
              system to process the request, if available.
        
              That is, linkToLocal() generates a <A> link that tries
              to service the request from the local, client-side 
              Junction if available.
        
              The onclick event handler will invoke TrimPath.junctionClient.get|post().
              The boolean return value of TrimPath.junctionClient.get|post() signals whether
              the browser should proceed with a normal HTTP request to the server or whether
              the client-side Junction system processed the request already.
        
              If the client-side Junction system is not locally available,
              the link click will cause the browser to request and
              a new HTML web page, based on the link's href property.
        
            Multiple call signatures:
              The linkToLocal() method supports two call signatures...
              - linkToLocal(linkText, controllerName, actionName, objId (optional), htmlOptions (optional))
              - linkToLocal(linkText, args, htmlOptions)
        
              The args is a hash or map object that holds request parameters.
        
            Example:
            > <%= linkToLocal('Home', 'home', 'index', null, { 'class':'red' }) %>
            > <%= linkToLocal('Home', { controllerName : 'home',
            >                           actionName     : 'index' }, 
            >                           { 'class':'red' }) %>
        
            Parameters:
            - linkText - A string that becomes the content of the <A></A> links.
            - controllerName - A string name of a Controller. 
                               If null, defaults to the name of the Controller of the current request.
            - actionName - A string name of an action method. 
                           If null, defaults to the action method name of the current request.
            - objId - A string or number of a target object for the action to focus on.
            - args - The args is a hash/map object that holds request parameters.
            - htmlOptions - An optional hash/map object, containing extra
                            HTML attributes and values for the <A> tag.
        
            Example:
            > <%= linkToLocal('Home', 'home', 'index', null, { 'class':'menuLink' }) %>
            > // becomes...
            > <a href="?controllerName=home&actionName=index"
            >    class="menuLink"
            >    onclick="return TrimPath.junctionClient.get('home', 'index');">
            >    Home</a>
        
            Returns:
              A string of an HTML <a> link.
            */
            //
            link_to_local : function(linkText, controllerName, actionName, objId, htmlOptions) {
                var argsClick = null;
                var args      = null;
                if (typeof(controllerName) == 'object') { // Called with 2nd signature.
                    args        = controllerName;
                    argsClick   = junctionUtil.toJsonString(args).replace(/"/gm, "'").replace(/[\n\r]/gm, '');
                    htmlOptions = actionName || {};
                } else {
                    args        = urlForArgsPrep(controllerName, actionName, objId);
                    htmlOptions = htmlOptions || {};
                }
        
                var method = (htmlOptions.method || 'get').toLowerCase();
                delete htmlOptions.method;
        
                htmlOptions.onclick = (res || helpers).linkToLocalOnclick(htmlOptions.onclick,
                    method, 
                    args.controllerName || args.controller, 
                    args.actionName     || args.action,
                    args.objId          || args.id,
                    argsClick);
        
                return (res || helpers).linkToArgs(linkText, urlForArgsPrep(args), htmlOptions);
            },
        
            link_to_local_onclick : function(onclickPrefix, method, 
                                             controllerName, actionName, objId, 
                                             argsStr) {
                var result = [ 
                    onclickPrefix || '',
                    ";return TrimPath.junctionClient.", method, "('",
                        controllerName, "', '",
                        actionName, "'" 
                ];
        
                if (objId) {
                    result.push(", '");
                    result.push(objId);
                    result.push("', ");
                } else
                    result.push(", null, ");
        
                result.push(argsStr || 'null');
                result.push(");");
        
                return result.join('');
            },
        
            ///////////////////////////////////////////////////////        
            /*
            Section: Form Tags
            */

            default_form_id : function(args) {
                return (res || helpers).urlForArgs(args).replace(/&/g, '|');
            },
        
            /* 
            Function: startFormTag (controllerName, actionName, objId, htmlOptions)
              Returns a <form> tag whose action URL is to the given controller/action.
        
              The startFormTag() function also generates an id for the returned <form>,
              if not overriden by using the htmlOptions parameter.  For example,
              <%= startFormTag('blog', 'create', null, { id: "blogCreateForm" }) %>
        
            Example, in EST tag syntax:
            > <%= startFormTag('order', 'addOrderLine', order.id, { style: "color:blue;", 'class': 'big_form' }) %>
            >   ...
            > <%= endFormTag() %>
        
            ...is equivalent to...
        
            > <form action="?controllerName=order&action=addOrderLine&objId=12" method="post"
            >       id="...some generated form id..."
            >       style="color:blue;" class="big_form">
            >   ...
            > </form>
        
            Parameters:
              controllerName - A string name of a Controller.  
                               For example: 'blog', 'invoice', 'invoiceLine'.
              actionName - A string name of an action method.
                           For example, 'show', 'newInstance', 'create', 'cancel'.
              objId - An optional string of a target Model id to focus the operation on, or null.
              htmlOptions - An optional map object of key/value pairs that are
                            emitted as HTML attribute="value" properties.
        
            Use the htmlOptions to set the <form> method, which defaults to 'post'.
        
            To set the CSS class name of the <form>, also use the htmlOptions.
            But, set the key name to 'class' (with quotes) instead of just class,
            because class is a reserved JavaScript keyword.  For example, use...
            <%= start_form_tag('blog', 'create', null, { 'class' : 'hoverable big_form' } %>
            instead of...
            <%= start_form_tag('blog', 'create', null, { class : 'hoverable big_form' } %>                    
        
            Returns:
              A string of HTML <form> start tag.
            */
            //
            start_form_tag : function(controllerName, actionName, objId, htmlOptions) {
                lastFormArgs = urlForArgsPrep(controllerName, actionName, objId);
                lastFormArgs.htmlOptions        = htmlOptions                     || {};
                lastFormArgs.htmlOptions.id     = lastFormArgs.htmlOptions.id     || (res || helpers).defaultFormId(lastFormArgs);
                lastFormArgs.htmlOptions.method = lastFormArgs.htmlOptions.method || 'post';
                var result = [ '<form action="', (res || helpers).urlFor(lastFormArgs.controllerName, lastFormArgs.actionName, lastFormArgs.objId), '"' ];
                junctionUtil.pushAttributes(result, lastFormArgs.htmlOptions);
                result.push('>');
                return result.join('');
            },
        
            /* 
            Function: startFormTagLocal (controllerName, actionName, objId, htmlOptions)
              Just like startFormTag(), but adds an onsubmit handler that
              invokes TrimPath.junctionClient.postForm().
        
            Example, in EST tag syntax:
            > <%= startFormTagLocal('order', 'create', null, { id: 'myForm' }) %>
            ...is equivalent to...
            > <form action="?controllerName=order&action=create" method="post"
            >   onsubmit="return TrimPath.junctionClient.postForm(document.getElementById('myForm'), 'order', 'create');"
            >   id="myForm">
            */
            //
            start_form_tag_local : function(controllerName, actionName, objId, htmlOptions) {
                args = urlForArgsPrep(controllerName, actionName, objId);
                htmlOptions    = htmlOptions    || {};
                htmlOptions.id = htmlOptions.id || (res || helpers).defaultFormId(args);
                htmlOptions.onsubmit = [ "return TrimPath.junctionClient.postForm(document.getElementById('", 
                                                htmlOptions.id, "'), '",
                                                args.controllerName, "', '",
                                                args.actionName, "'" ];
                if (args.objId) 
                    htmlOptions.onsubmit.push(", '" + args.objId + "'");
                htmlOptions.onsubmit.push(');');
                htmlOptions.onsubmit = htmlOptions.onsubmit.join('');
                return (res || helpers).startFormTag(args.controllerName, args.actionName, args.objId, htmlOptions);
            },
        
            /* 
            Function: endFormTag ()
              Returns an html </form> close tag string.
              For symmetry to the startFormTag/startFormTagLocal() methods.
            */
            //
            end_form_tag : function() {
                lastFormArgs = null;
                return "</form>";
            },
        
            ///////////////////////////////////////////////////////        
            /*
            Section: Input Tags
            */

            /* 
            Function: inputTag (name, value, inputType, htmlOptions)
              Returns an html <input/> tag string.
        
            Example:
            > <%= inputTag('customer[phone]', customer.phone, 'text') %>
            > // becomes...
            > <input type="text" 
            >        id="customer[phone]" 
            >        name="customer[phone]"
            >        value="555-1212"/>
        
            Parameters:
              - name - A string name property of the input control.
                       The name is also used as the id of the input control.
              - value - A string value of the input control.
              - inputType - A string input control type, such as 'text', 'hidden', 'password'.
              - htmlOptions - An optional hash/map object containing
                   property attributes of the <input> tag.
        
            CSS Class:
              In the htmlOptions, because class is a JavaScript
              reserved word, use a string key of 'class' to set the CSS class.
        
            > <%= inputTag('passwd', '', 'password', { 'class': 'bigFont' }) %>
            > // becomes...
            > <input type="password" 
            >        id="passwd" 
            >        name="passwd"
            >        value=""
            >        class="bigFont"/>
        
            Returns:
              A string of HTML <input/> tag.
            */
            //
            input_tag : function(name, value, inputType, htmlOptions) {
                htmlOptions = htmlOptions || {};
                (res || helpers).htmlOptionsPrepareConfirm(htmlOptions);
                if (value == null)
                    value = "";
                value = String(value).replace(/\"/g, '&quot;');
                var result = ['<input type="', inputType, '" id="', name, '" name="', name, '"'];
                junctionUtil.pushAttributes(result, htmlOptions);
                result.push(' value="');
                result.push(htmlOptions.valueFilter != null ? htmlOptions.valueFilter(value) : value);
                result.push('"/>');
                return result.join('');
            },
        
            /* 
            Function: inputField (objName, attrName, inputType, htmlOptions)
              Returns an html <input/> tag string that represents a Model field.
        
            Example:
            > // In your Controller action method...
            > res.customer = Customer.find(123)
            >
            > // In your View template (.est)...
            > <%= inputField('customer', 'phone', 'text') %>
            > // becomes...
            > <input type="text" 
            >        id="customer[phone]" 
            >        name="customer[phone]"
            >        value="555-1212"/>
        
            Parameters:
              - objName - A string name of the res property that
                          holds a Model instance.  E.g., use 'customer',
                          if you had set res.customer to a Customer instance.
              - attrName - A string field/column name on the Model instance.
              - inputType - A string input control type, such as 'text', 'hidden', 'password'.
              - htmlOptions - An optional hash/map object containing
                   property attributes of the <input> tag.
        
            Returns:
              A string of HTML <input/> tag.
            */
            //
            input_field : function(objName, attrName, inputType, htmlOptions) {
                htmlOptions = htmlOptions || {};
                var value = null;
                if (res != null &&
                    res[objName] != null)
                    value = res[objName][attrName];
                return (res || helpers).inputTag(objName + '[' + attrName + ']', value, inputType, htmlOptions);
            },
        
            /* 
            Function: textField (objName, attrName, htmlOptions)
              Returns an html <input/> text tag string that represents a Model field.
        
            Example:
            > // In your Controller action method...
            > res.customer = Customer.find(123)
            >
            > // In your View template (.est)...
            > <%= textField('customer', 'phone') %>
            > // becomes...
            > <input type="text" 
            >        id="customer[phone]" 
            >        name="customer[phone]"
            >        value="555-1212"/>
        
            Parameters:
              - objName - A string name of the res property that
                          holds a Model instance.  E.g., use 'customer',
                          if you had set res.customer to a Customer instance.
              - attrName - A string field/column name on the Model instance.
              - htmlOptions - An optional hash/map object containing
                              property attributes of the <input> tag.
        
            Returns:
              A string of HTML <input/> text tag.
            */
            //
            text_field : function(objName, attrName, htmlOptions) { return (res || helpers).inputField(objName, attrName, 'text', htmlOptions); },
        
            /* 
            Function: hiddenField (objName, attrName, htmlOptions)
              Returns an html <input/> hidden tag string that represents a Model field.
        
            Example:
            > // In your Controller action method...
            > res.customer = Customer.find(123)
            >
            > // In your View template (.est)...
            > <%= hiddenField('customer', 'phone') %>
            > // becomes...
            > <input type="hidden" 
            >        id="customer[phone]" 
            >        name="customer[phone]"
            >        value="555-1212"/>
        
            Parameters:
              - objName - A string name of the res property that
                          holds a Model instance.  E.g., use 'customer',
                          if you had set res.customer to a Customer instance.
              - attrName - A string field/column name on the Model instance.
              - htmlOptions - An optional hash/map object containing
                              property attributes of the <input> tag.
        
            Returns:
              A string of HTML <input/> hidden tag.
            */
            //
            hidden_field : function(objName, attrName, htmlOptions) { return (res || helpers).inputField(objName, attrName, 'hidden', htmlOptions); },
        
            /* 
            Function: passwordField (objName, attrName, htmlOptions)
              Returns an html <input/> password tag string that represents a Model field.
        
            Example:
            > // In your Controller action method...
            > res.customer = Customer.find(123)
            >
            > // In your View template (.est)...
            > <%= passwordField('customer', 'verification_secret') %>
            > // becomes...
            > <input type="password" 
            >        id="customer[verification_secret]" 
            >        name="customer[verification_secret]"
            >        value="big camera"/>
        
            Parameters:
              - objName - A string name of the res property that
                          holds a Model instance.  E.g., use 'customer',
                          if you had set res.customer to a Customer instance.
              - attrName - A string field/column name on the Model instance.
              - htmlOptions - An optional hash/map object containing
                              property attributes of the <input> tag.
        
            Returns:
              A string of HTML <input/> password tag.
            */
            //
            password_field : function(objName, attrName, htmlOptions) { return (res || helpers).inputField(objName, attrName, 'password', htmlOptions); },
        
            /* 
            Function: radioButton (objName, attrName, tagValue, htmlOptions)
              Returns an html <input/> radio tag string that represents a Model field.
        
            Example:
            > // In your Controller action method...
            > res.customer = Customer.find(123)
            >
            > // In your View template (.est)...
            > Male: <%= radioButton('customer', 'gender', 'male') %> <br/>
            > Female: <%= radioButton('customer', 'gender', 'female') %>
            > // becomes...
            > Male: <input type="radio" 
            >              id="customer[gender]" 
            >              name="customer[gender]"
            >              value="male" checked="checked"/> <br/>
            > Female: <input type="radio" 
            >                id="customer[gender]" 
            >                name="customer[gender]"
            >                value="female"/> <br/>
        
            Parameters:
              - objName - A string name of the res property that
                          holds a Model instance.  E.g., use 'customer',
                          if you had set res.customer to a Customer instance.
              - attrName - A string field/column name on the Model instance.
              - tagValue - If the Model instance has an field/column value
                           the same as the tagValue, the radio button is 
                           marked as checked.
              - htmlOptions - An optional hash/map object containing
                              property attributes of the <input> tag.
        
            Returns:
              A string of HTML <input/> radio tag.
            */
            //
            radio_button : function(objName, attrName, tagValue, htmlOptions) {
                htmlOptions = htmlOptions || {};
                if (res != null &&
                    res[objName] != null && 
                    res[objName][attrName] == tagValue)
                    htmlOptions.checked = 'checked';
                return (res || helpers).inputTag(objName + '[' + attrName + ']', tagValue, 'radio', htmlOptions);
            },
        
            /* 
            Function: select (objName, attrName, choices, htmlOptions)
              Returns an html <select> tag string that represents a Model field.
        
            Example:
            > // In your Controller action method...
            > res.customer = Customer.find(123)
            >
            > // In your View template (.est)...
            > Gender: <%= select('customer', 'gender', ['male', 'female']) %> <br/>
            > // becomes...
            > Gender: <select name="customer[gender]">
            >  <option value="male" selected="selected">male</option>
            >  <option value="female">female</option>
            > </select>
            >
            > <%= select('customer', 'gender', [['Guy', 'male'], ['Gal', 'female']]) %> <br/>
            > // becomes...
            > <select name="customer[gender]">
            >  <option value="male" selected="selected">Guy</option>
            >  <option value="female">Gal</option>
            > </select>
        
            Parameters:
              - objName - A string name of the res property that
                          holds a Model instance.  E.g., use 'customer',
                          if you had set res.customer to a Customer instance.
              - attrName - A string field/column name on the Model instance.
              - choices - An Array of choices.  Each item in the Array 
                          may be either a string, or a 2-item Array.
                          A single string for an item represents both the value
                          stored in the Model instance and the display string for
                          the choice.  For a 2-item Array, the first
                          item is the choice display string, and the
                          second item is the value stored in the Model instance.
              - htmlOptions - An optional hash/map object containing
                              property attributes of the <input> tag.
        
            Returns:
              A string of HTML <input/> radio tag.
            */
            select : function(objName, attrName, choices, htmlOptions) {
                htmlOptions = htmlOptions || {};
                var value = null;
                if (res != null &&
                    res[objName] != null)
                    value = res[objName][attrName];
                // TODO: Should we add an id attribute here?
                var result = ['<select name="', objName, '[', attrName, ']"'];
                junctionUtil.pushAttributes(result, htmlOptions);
                result.push('>');
                result.push((res || helpers).optionsForSelect(choices, 
                                                              htmlOptions.valueFilter != null ? htmlOptions.valueFilter(value) : value));
                result.push('</select>');
                return result.join('');
            },
        
            options_for_select : function(choices, selected) {
                var result = [];
                for (var i = 0; i < choices.length; i++) {
                    var name, value;
                    var choice = choices[i];
                    if (choice != null &&
                        choice instanceof Array) {
                        name  = choice[0];
                        value = choice[1];
                        styleOption = choice[2];
                    } else
                        name = value = choice;
                    if (value == null)
                        value = '';
                    result.push('<option value="' + value + '"');
                    if (value == selected)
                        result.push(' selected="selected"');
                    if (choice instanceof Array)
                        junctionUtil.pushAttributes(result, choice[2]); // The choice[2] == htmlOptions.
                    result.push(' style="' + styleOption + ';">');
                    result.push(name);
                    result.push('</option>');
                }
                return result.join('');
            },
        
            /* 
            Function: textArea (objName, attrName, htmlOptions)
              Returns an html <textarea> tag string that represents a Model field.
        
            Example:
            > // In your Controller action method...
            > res.customer = Customer.find(123)
            >
            > // In your View template (.est)...
            > <%= textArea('customer', 'notes') %>
            > // becomes...
            > <textarea name="customer[notes]">one of our oldest, best customers</textarea>
        
            Parameters:
              - objName - A string name of the res property that
                          holds a Model instance.  E.g., use 'customer',
                          if you had set res.customer to a Customer instance.
              - attrName - A string field/column name on the Model instance.
              - htmlOptions - An optional hash/map object containing
                              property attributes of the <input> tag.
        
            Returns:
              A string of HTML <textarea> tag.
            */
            //
            text_area : function(objName, attrName, htmlOptions) { 
                htmlOptions = htmlOptions || {};
                var value = null;
                if (res != null &&
                    res[objName] != null)
                    value = res[objName][attrName];
                if (value == null)
                    value = "";
                // TODO: Should we add an id attribute here?
                var result = ['<textarea name="', objName, '[', attrName, ']"'];
                junctionUtil.pushAttributes(result, htmlOptions);
                result.push('>');
                result.push(htmlOptions.valueFilter != null ? htmlOptions.valueFilter(value) : junctionUtil.escape(value));
                result.push('</textarea>');
                return result.join('');
            },
        
            /* 
            Function: submitButton (name, value, htmlOptions)
              Returns an html <input/> submit tag.
        
            Example:
            > // In your View template (.est)...
            > <%= submitButton('go_button', 'Search Invoices') %>
            > // becomes...
            > <input type="submit"
            >        id="go_button" 
            >        name="go_button" 
            >        value="Search Invoices"/>
        
            Parameters:
              - name - A string name and id property of the <input/> submit tag.
              - value - A string value property of the <input/> submit tag.
              - htmlOptions - An optional hash/map object containing
                              property attributes of the <input> tag.
        
            Returns:
              A string of HTML <input/> submit tag.
            */
            //
            submit_button : function(name, value, htmlOptions) {
                return (res || helpers).inputTag(name, value, 'submit', htmlOptions);
            },
        
            /* 
            Function: submitButtonLocal (name, value, htmlOptions)
              Returns an html <input/> submit tag, with an onclick
              handler that calls TrimPath.junctionClient.postForm().
        
              When you use submitButtonLocal() instead of submitButton(),
              the local, client-side Junction system will process the
              form submission/post, if available.
        
              If the client-side Junction system is not available,
              then the browser will proceed with a normal HTTP POST
              to the remote server (as specified in the <form> action.
        
              You must use submitButtonLocal() inside a call to
              startFormTagLocal().  This is because submitButtonLocal()
              remembers the information from the last startFormTagLocal(),
              using it to generate the call to TrimPath.junctionClient.postForm(...).
        
            Example:
            > <%= startFormTagLocal('order', 'create', null, { id: 'myForm' }) %>
            >   <%= submitButtonLocal('go', 'Create Order') %>
            > <%= endFormTag() %>
            >
            > // The submitButtonLocal() markup call becomes...
            > <input type="submit"
            >        id="go" 
            >        name="go" 
            >        value="Create Order"
            >        onclick="return TrimPath.junctionClient.postForm(document.getElementById(...), 'order', 'create');"/>
        
            Parameters:
              - name - A string name and id property of the <input/> submit tag.
              - value - A string value property of the <input/> submit tag.
              - htmlOptions - An optional hash/map object containing
                              property attributes of the <input> tag.
        
            Returns:
              A string of HTML <input/> submit tag.
            */
            //
            submit_button_local : function(name, value, htmlOptions) {
                htmlOptions = htmlOptions || {};
                htmlOptions.onclick = [ "return TrimPath.junctionClient.postForm(document.getElementById('", 
                                            lastFormArgs.htmlOptions.id, "'), '",
                                            lastFormArgs.controllerName, "', '",
                                            lastFormArgs.actionName, "'" ];
                if (lastFormArgs.objId) 
                    htmlOptions.onclick.push(", '" + lastFormArgs.objId + "'");
                else
                    htmlOptions.onclick.push(", null");
                htmlOptions.onclick.push(", null, '" + name + "'");
                htmlOptions.onclick.push(');');
                htmlOptions.onclick = htmlOptions.onclick.join('');
                return (res || helpers).submitButton(name, value, htmlOptions)
            },
        
            ///////////////////////////////////////////////////////        
            /*
            Section: Error Messages
            */

            /* 
            Function: errorMessagesOn (objName, attrName, ...)
              Returns an html string of <div>'s for each validation error
              messages on a particular Model field.  Or, returns
              an empty string ("") if there are no error messages
              on that particular Model field/column.
        
              Each separate error messages will have its own <div> block.
        
            Example:
            > // In your Controller action method...
            > res.customer = Customer.find(123)
            > res.customer.last_name = null; // Invalid last_name.
            > res.customer.save() == false; // Captures error messages during save validation.
            >
            > // In your View template (.est), use...
            > <%= errorMessagesOn('customer', 'last_name') %>
        
            Parameters:
              - objName - A string name of the res property that
                          holds a Model instance.  E.g., use 'customer',
                          if you had set res.customer to a Customer instance.
              - attrName - A string field/column name on the Model instance.
              - prependText - An optional string of text to add to the start of 
                              each <div>.  Defaults to "".
              - appendText - An optional string of text to add to the end of 
                             each <div>.  Defaults to "".
              - cssClass - An optional string of the CSS class name(s)
                           for the generated <div>.  Defaults to 'formError'.
        
            Returns:
              A string of "" or an HTML <div> tag.
            */
            //
            error_messages_on : function(objName, attrName, prependText, appendText, cssClass) {
                if (res != null &&
                    res[objName] != null &&
                    res[objName].errors != null &&
                    res[objName].errors().isInvalid(attrName)) {
                    prependText = prependText || "";
                    appendText  = appendText  || "";
                    cssClass    = cssClass    || "formError";
                    var start   = '<div class="' + cssClass + '">' + prependText;
                    var end     = appendText + '</div>';
                    var msgs    = res[objName].errors().fullMessagesOn(attrName);
                    return start + msgs.join(end + start) + end;
                }
                return "";
            },
        
            /* 
            Function: errorMessagesFor (objName, options)
              Returns an html <div> string containing all the
              validation error messages on a Model instance.
              Or, returns an empty string ("") if there are no 
              validation error messages on the Model instance.
        
            Example:
            > <%= errorMessagesFor('customer') %>
        
            Parameters:
              - objName - A string name of the res property that
                          holds a Model instance.  E.g., use 'customer',
                          if you had set res.customer to a Customer instance.
              - options - An optional hash/map object.
        
            The options can include entries for...
              - headerTag - An optional string tag name for the header of the <div>.
                            Defaults to 'h2'.
              - id - An optional string id attribute for the <div> block.
                     Defaults to 'errorExplanation'.
              - 'class' - An optional string CSS class name(s) to 
                          use for the <div> block.
                          Defaults to 'errorExplanation'.
        
            Returns:
              A string of "" or an HTML <div> tag.
            */
            //
            error_messages_for : function(objName, options) {
                if (res == null ||
                    res[objName] == null ||
                    res[objName].errors == null ||
                    res[objName].errors().isEmpty()) 
                    return "";
                options = options || {};
                options['headerTag'] = options['headerTag'] || 'h2';
                options['id']        = options['id']        || 'errorExplanation';
                options['class']     = options['class']     || 'errorExplanation';
                var result = [ '<div class="', options['class'], '"><', options['headerTag'], '>Errors for ', objName, '</', options['headerTag'], '><div>' ];
                result.push(res[objName].errors().fullMessages().join('</div><div>'));
                result.push('</div></div>');
                return result.join('');
            },

            ///////////////////////////////////////////////////////        
            /*
            Section: Safety
            */

            /* Function: h (str)
              An alias for the escape function.
            */
            /* Function: escape (str)
              Converts &, <, >, " characters into HTML entity markup.
              Used to prevent JavaScript injection attacks when displaying data input from the user.

            Example:
            > Forum Topic: <%= escape(forum.title) %>
            > Forum Topic: <%= h(forum.title) %>

            Parameters:
            - str - A string to convert.

            Returns:
              An entitized string.
            */
            escape : function(str) { 
                return junctionUtil.escape(str);
            }
        });

        helpers.h = helpers.escape;

        return helpers;
    }

    /////////////////////////////////////////////////

    // External code that wants to register more helpers should just 
    // push another helper maker function onto TrimPath.junctionHelperMakers.
    //    
    TrimPath.junctionHelperMakers = TrimPath.junctionHelperMakers || [];
    TrimPath.junctionHelperMakers.push(helperMaker);

}) ();
