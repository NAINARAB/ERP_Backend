const apiData = [
    {
      method: 'GET',
      api: '/api/login',
      authorization: '-',
      header: '-',
      query: 'user, pass',
      param: '-',
      body: '-'
    },
    {
      method: 'PUT',
      api: '/api/logout',
      authorization: '-',
      header: '-',
      query: 'userid, sessionId',
      param: '-',
      body: '-'
    },
    {
      method: 'GET',
      api: '/api/pagerights',
      authorization: 'token',
      header: 'Authorization',
      query: 'menuid, menutype',
      param: '-',
      body: '-'
    },
    {
      method: 'GET',
      api: '/api/branch',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: '-'
    },
    {
      method: 'GET',
      api: '/api/users',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: '-'
    },
    {
      method: 'POST',
      api: '/api/users',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: 'name, mobile, usertype, password, branch'
    },
    {
      method: 'PUT',
      api: '/api/users',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: 'userid, name, mobile, usertype, password, branch'
    },
    {
      method: 'DELETE',
      api: '/api/users',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: 'userid',
      body: '-'
    },
    {
      method: 'GET',
      api: '/api/usertype',
      authorization: 'token',
      header: 'Authorization',
      query: 'usertype',
      param: '-',
      body: '-'
    },
    {
      method: 'GET',
      api: '/api/userid',
      authorization: 'token',
      header: 'Authorization',
      query: 'user, pass',
      param: '-',
      body: '-'
    },
    {
      method: 'GET',
      api: '/api/listlos',
      authorization: 'token',
      header: 'Authorization, Db',
      query: '-',
      param: '-',
      body: '-'
    },
    {
      method: 'GET',
      api: '/api/stockabstract',
      authorization: 'token',
      header: 'Authorization, Db',
      query: 'Fromdate, Todate, Group_ST, Stock_Group, Bag, Brand, Item_Name',
      param: '-',
      body: '-'
    },
    {
      method: 'GET',
      api: '/api/losdropdown',
      authorization: 'token',
      header: 'Authorization, Db',
      query: '-',
      param: '-',
      body: '-'
    },
    {
      method: 'GET',
      api: '/api/sf/products',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: '-'
    },
    {
      method: 'POST',
      api: '/api/sf/products',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: 'data'
    },
    {
      method: 'GET',
      api: '/api/sf/retailers',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: '-'
    },
    {
      method: 'POST',
      api: '/api/sf/retailers',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: 'data'
    },
    {
      method: 'GET',
      api: '/api/sf/sfdetails',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: '-'
    },
    {
      method: 'POST',
      api: '/api/sf/sfdetails',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: 'data'
    },
    {
      method: 'GET',
      api: '/api/sf/routes',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: '-'
    },
    {
      method: 'POST',
      api: '/api/sf/routes',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: 'data'
    },
    {
      method: 'GET',
      api: '/api/sf/distributors',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: '-'
    },
    {
      method: 'POST',
      api: '/api/sf/distributors',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: 'data'
    },
    {
      method: 'GET',
      api: '/api/sf/saleorders',
      authorization: 'token',
      header: 'Authorization',
      query: 'from, to',
      param: '-',
      body: '-'
    },
    {
      method: 'POST',
      api: '/api/syncsalesorder',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: 'data'
    },
    {
      method: 'GET',
      api: '/api/listsalesorder',
      authorization: 'token',
      header: 'Authorization',
      query: 'start, end',
      param: '-',
      body: '-'
    },
    {
      method: 'GET',
      api: '/api/orderinfo',
      authorization: 'token',
      header: 'Authorization',
      query: 'orderno',
      param: '-',
      body: '-'
    },
    {
      method: 'GET',
      api: '/api/company',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: '-'
    },
    {
      method: 'GET',
      api: '/api/sidebar',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: '-'
    },
    {
      method: 'GET',
      api: '/api/side',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: '-'
    },
    {
      method: 'POST',
      api: '/api/updatesidemenu',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: 'MenuId, MenuType, User, ReadRights, AddRights, EditRights, DeleteRights, PrintRights'
    },
    {
      method: 'GET',
      api: '/api/usertypeauth',
      authorization: 'token',
      header: 'Authorization',
      query: 'usertype',
      param: '-',
      body: '-'
    },
    {
      method: 'POST',
      api: '/api/usertypeauth',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: 'MenuId, MenuType, UserType, ReadRights, AddRights, EditRights, DeleteRights, PrintRights'
    },
    {
      method: 'GET',
      api: '/api/newmenu',
      authorization: 'token',
      header: 'Authorization',
      query: '-',
      param: '-',
      body: 'menuType, menuName, menuLink, mainMenuId, subMenuId'
    }
  ];

  export default apiData;